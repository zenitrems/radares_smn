"""Ingesta de estaciones automáticas del SMN (SIVEA) a PostgreSQL.

Descarga el reporte CSV de cada estación de estaciones.json y guarda en PostgreSQL sólo las lecturas nuevas.
"""

import argparse
import csv
import json
import logging
import math
import os
import signal
import threading
import time
import unicodedata
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

import psycopg
import requests
from dotenv import load_dotenv
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

REPORTE_URL = "https://smn.conagua.gob.mx/tools/GUI/sivea_v3/php/getReporteEstacion.php"
USER_AGENT = "radares-smn-ingesta/1.0"

DEFAULT_ESTACIONES_JSON = os.path.join(os.path.dirname(os.path.abspath(__file__)), "estaciones.json")
DEFAULT_INTERVAL = 1800
DEFAULT_PAUSA = 0.5
DEFAULT_TIMEOUT = 60

# Encabezado del CSV (sin acentos, minúsculas y sin la unidad) -> columna.
COLUMNAS = {
    "temperatura del aire": "temperatura",
    "humedad relativa": "humedad",
    "presion atmosferica": "presion",
    "precipitacion": "precipitacion",
    "radiacion solar": "radiacion",
    "direccion del viento": "viento_dir",
    "rapidez de viento": "viento_vel",
    "direccion de rafaga": "racha_dir",
    "rapidez de rafaga": "racha_vel",
}
VARIABLES = tuple(COLUMNAS.values())
ENCABEZADOS_CONOCIDOS = set(COLUMNAS) | {"fecha local", "fecha utc"}

# Fuera de estos rangos el valor es un centinela de "sin dato" del SMN (presión 0
# en estaciones sin barómetro, humedad 0, radiación -1...) y se guarda como NULL.
LIMITES = {
    "temperatura": (-60.0, 60.0),
    "humedad": (1.0, 100.0),
    "presion": (300.0, 1100.0),
    "precipitacion": (0.0, 500.0),
    "radiacion": (0.0, 2000.0),
    "viento_dir": (0.0, 360.0),
    "viento_vel": (0.0, 400.0),
    "racha_dir": (0.0, 360.0),
    "racha_vel": (0.0, 400.0),
}
# Algunas estaciones publican con el reloj mal; se descartan lecturas del futuro.
TOLERANCIA_FUTURO = timedelta(hours=1)

_COLUMNAS_SQL = ", ".join(VARIABLES)
_PLACEHOLDERS = ", ".join(["%s"] * (len(VARIABLES) + 2))
_ANTES = ", ".join(f"observaciones.{c}" for c in VARIABLES)
_DESPUES = ", ".join(f"COALESCE(EXCLUDED.{c}, observaciones.{c})" for c in VARIABLES)
_ASIGNACIONES = ", ".join(f"{c} = COALESCE(EXCLUDED.{c}, observaciones.{c})" for c in VARIABLES)

# Una lectura tardía completa columnas vacías sin borrar las existentes; si nada
# cambia no se reescribe la fila, así reprocesar la ventana de 24 h no genera escrituras.
SQL_OBSERVACIONES = f"""
INSERT INTO observaciones (estacion_m, fecha_utc, {_COLUMNAS_SQL})
VALUES ({_PLACEHOLDERS})
ON CONFLICT (estacion_m, fecha_utc) DO UPDATE SET {_ASIGNACIONES}
WHERE ({_ANTES}) IS DISTINCT FROM ({_DESPUES})
"""

SQL_ESTACION = """
INSERT INTO estaciones
    (estacion_m, nombre_estacion, organismo, tipo, municipio, estado, lon, lat, altitud, activa)
VALUES (%(estacion_m)s, %(nombre_estacion)s, %(organismo)s, %(tipo)s, %(municipio)s,
        %(estado)s, %(lon)s, %(lat)s, %(altitud)s, true)
ON CONFLICT (estacion_m) DO UPDATE SET
    nombre_estacion = EXCLUDED.nombre_estacion, organismo = EXCLUDED.organismo,
    tipo = EXCLUDED.tipo, municipio = EXCLUDED.municipio, estado = EXCLUDED.estado,
    lon = EXCLUDED.lon, lat = EXCLUDED.lat, altitud = EXCLUDED.altitud, activa = true
"""

SQL_DESACTIVAR = "UPDATE estaciones SET activa = false WHERE activa AND estacion_m <> ALL(%s)"
SQL_ULTIMA = "SELECT max(fecha_utc) FROM observaciones WHERE estacion_m = %s"

logger = logging.getLogger("ingesta")
_encabezados_avisados = set()


class ReporteInvalido(Exception):
    pass


def configurar_logging(nivel: str) -> None:
    logging.basicConfig(
        level=getattr(logging, nivel.upper(), logging.INFO),
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def config_db() -> dict:
    requeridas = ("DB_HOST", "DB_NAME", "INGESTA_DB_USER", "INGESTA_DB_PASSWORD")
    faltan = [v for v in requeridas if not os.environ.get(v)]
    if faltan:
        raise SystemExit(f"Faltan variables de entorno: {', '.join(faltan)} (ver .env.example)")
    return {
        "host": os.environ["DB_HOST"],
        "port": int(os.environ.get("DB_PORT", "5432")),
        "dbname": os.environ["DB_NAME"],
        "user": os.environ["INGESTA_DB_USER"],
        "password": os.environ["INGESTA_DB_PASSWORD"],
        "sslmode": os.environ.get("DB_SSLMODE", "prefer"),
    }


def cargar_estaciones(ruta: str) -> List[dict]:
    with open(ruta, "r", encoding="utf-8") as f:
        crudas = json.load(f)

    estaciones = []
    for e in crudas:
        estaciones.append(
            {
                "estacion_m": e["estacion_m"],
                "nombre_estacion": e["nombre_estacion"],
                "organismo": e.get("organismo"),
                "tipo": e.get("tipoestacion"),
                "municipio": e.get("municipio"),
                "estado": e.get("estado"),
                "lon": float(e["longitud"]),
                "lat": float(e["latitud"]),
                "altitud": int(e["altitud"]) if e.get("altitud") is not None else None,
            }
        )
    return estaciones


def crear_sesion() -> requests.Session:
    sesion = requests.Session()
    sesion.headers["User-Agent"] = USER_AGENT
    reintentos = Retry(total=2, backoff_factor=2, status_forcelist=(500, 502, 503, 504))
    sesion.mount("https://", HTTPAdapter(max_retries=reintentos))
    return sesion


def _normalizar(encabezado: str) -> str:
    sin_unidad = encabezado.split("(")[0]
    descompuesto = unicodedata.normalize("NFKD", sin_unidad)
    return "".join(c for c in descompuesto if not unicodedata.combining(c)).strip().lower()


def _numero(texto: str) -> Optional[float]:
    texto = texto.strip()
    if not texto:
        return None
    try:
        valor = float(texto)
    except ValueError:
        return None
    return valor if math.isfinite(valor) else None


def parsear_reporte(texto: str) -> Dict[datetime, Dict[str, float]]:
    """CSV del SMN -> {fecha_utc: {columna: valor}}, sólo con valores presentes."""
    lineas = texto.splitlines()
    inicio = next((i for i, l in enumerate(lineas) if l.startswith('"Fecha Local"')), None)
    if inicio is None:
        raise ReporteInvalido(texto.strip()[:120] or "respuesta vacía")

    lector = csv.reader(lineas[inicio:])
    encabezado = next(lector)
    normalizados = [_normalizar(h) for h in encabezado]

    if "fecha utc" not in normalizados:
        raise ReporteInvalido("el reporte no trae la columna 'Fecha UTC'")
    idx_fecha = normalizados.index("fecha utc")

    for original, norm in zip(encabezado, normalizados):
        if norm not in ENCABEZADOS_CONOCIDOS and norm not in _encabezados_avisados:
            _encabezados_avisados.add(norm)
            logger.warning("Columna desconocida en el reporte del SMN, se ignora: %r", original)

    columnas = {i: COLUMNAS[n] for i, n in enumerate(normalizados) if n in COLUMNAS}
    if not columnas:
        raise ReporteInvalido("el reporte no trae ninguna variable conocida")

    registros: Dict[datetime, Dict[str, float]] = {}
    for fila in lector:
        if len(fila) <= idx_fecha:
            continue
        try:
            fecha = datetime.fromisoformat(fila[idx_fecha].strip()).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
        valores = registros.setdefault(fecha, {})
        for i, columna in columnas.items():
            if i < len(fila):
                valor = _numero(fila[i])
                minimo, maximo = LIMITES[columna]
                if valor is not None and minimo <= valor <= maximo:
                    valores[columna] = valor
    return registros


def elegir_tipo(ultima: Optional[datetime], ahora: datetime) -> int:
    """1 = 24 h, 2 = 1 semana, 3 = 90 días. El SMN publica con 1-10 h de retraso,
    por eso se deja margen en los umbrales."""
    if ultima is None:
        return 3
    edad = ahora - ultima
    if edad <= timedelta(hours=20):
        return 1
    if edad <= timedelta(days=6):
        return 2
    return 3


def descargar_reporte(sesion: requests.Session, nombre_estacion: str, tipo: int, timeout: int) -> str:
    respuesta = sesion.get(
        REPORTE_URL,
        params={"tipo": tipo, "nombre_estacion": nombre_estacion},
        timeout=timeout,
    )
    respuesta.raise_for_status()
    return respuesta.content.decode("utf-8-sig")


def conectar(config: dict, intentos: int = 6, espera: float = 5.0) -> psycopg.Connection:
    for intento in range(1, intentos + 1):
        try:
            return psycopg.connect(**config, connect_timeout=10)
        except psycopg.OperationalError as e:
            if intento == intentos:
                raise
            logger.warning("Sin conexión a PostgreSQL (%d/%d): %s", intento, intentos, str(e).strip())
            time.sleep(espera)
    raise AssertionError("inalcanzable")


def sincronizar_estaciones(conn: psycopg.Connection, estaciones: List[dict]) -> None:
    with conn.cursor() as cur:
        cur.executemany(SQL_ESTACION, estaciones)
        cur.execute(SQL_DESACTIVAR, ([e["estacion_m"] for e in estaciones],))
    conn.commit()


def procesar_estacion(
    conn: psycopg.Connection,
    sesion: requests.Session,
    estacion: dict,
    ahora: datetime,
    timeout: int,
) -> Optional[int]:
    """Devuelve las filas escritas, o None si el SMN no tiene datos de la estación."""
    clave = estacion["estacion_m"]
    with conn.cursor() as cur:
        cur.execute(SQL_ULTIMA, (clave,))
        ultima = cur.fetchone()[0]
    conn.commit()  # no dejar la transacción abierta durante la descarga

    tipo = elegir_tipo(ultima, ahora)
    registros = parsear_reporte(descargar_reporte(sesion, estacion["nombre_estacion"], tipo, timeout))

    futuras = [f for f in registros if f > ahora + TOLERANCIA_FUTURO]
    for fecha in futuras:
        del registros[fecha]
    if futuras:
        logger.warning(
            "Lecturas con fecha futura descartadas | estación=%s n=%d hasta=%s",
            clave,
            len(futuras),
            max(futuras).strftime("%Y-%m-%d %H:%MZ"),
        )

    if not registros:
        logger.warning("Sin datos | estación=%s tipo=%d", clave, tipo)
        return None

    filas = [(clave, fecha, *(v.get(c) for c in VARIABLES)) for fecha, v in registros.items()]
    with conn.cursor() as cur:
        cur.executemany(SQL_OBSERVACIONES, filas)
        escritas = cur.rowcount
    conn.commit()

    logger.info(
        "Estación=%s tipo=%d leídas=%d escritas=%d última=%s",
        clave,
        tipo,
        len(filas),
        escritas,
        max(registros).strftime("%Y-%m-%d %H:%MZ"),
    )
    return escritas


def ejecutar_ciclo(
    config_conexion: dict,
    sesion: requests.Session,
    estaciones: List[dict],
    pausa: float,
    timeout: int,
    parar: threading.Event,
) -> None:
    ahora = datetime.now(timezone.utc)
    escritas = sin_datos = errores = 0

    with conectar(config_conexion) as conn:
        sincronizar_estaciones(conn, estaciones)

        for estacion in estaciones:
            if parar.is_set():
                break
            try:
                resultado = procesar_estacion(conn, sesion, estacion, ahora, timeout)
                if resultado is None:
                    sin_datos += 1
                else:
                    escritas += resultado
            except (requests.RequestException, ReporteInvalido) as e:
                errores += 1
                logger.error("Error al descargar | estación=%s -> %s", estacion["estacion_m"], e)
            except psycopg.Error as e:
                errores += 1
                logger.error("Error de base de datos | estación=%s -> %s", estacion["estacion_m"], e)
                if conn.broken:
                    raise
                conn.rollback()
            parar.wait(pausa)

    logger.info(
        "Ciclo terminado | estaciones=%d filas_escritas=%d sin_datos=%d errores=%d",
        len(estaciones),
        escritas,
        sin_datos,
        errores,
    )


def construir_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Guarda en PostgreSQL las observaciones de las estaciones automáticas del SMN"
    )
    parser.add_argument(
        "--estaciones-json",
        default=os.environ.get("ESTACIONES_JSON", DEFAULT_ESTACIONES_JSON),
        help="Archivo JSON con las estaciones a consultar",
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=int(os.environ.get("INGESTA_INTERVAL", DEFAULT_INTERVAL)),
        help="Segundos entre ciclos (0 para ejecutar una sola vez)",
    )
    parser.add_argument(
        "--pausa",
        type=float,
        default=float(os.environ.get("INGESTA_PAUSA", DEFAULT_PAUSA)),
        help="Segundos de pausa entre estaciones",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=int(os.environ.get("INGESTA_TIMEOUT", DEFAULT_TIMEOUT)),
        help="Timeout en segundos de cada descarga",
    )
    parser.add_argument(
        "--log-level",
        default=os.environ.get("INGESTA_LOG_LEVEL", "INFO"),
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        help="Nivel de detalle del log",
    )
    return parser


def main() -> None:
    load_dotenv()
    args = construir_parser().parse_args()
    configurar_logging(args.log_level)

    config_conexion = config_db()
    estaciones = cargar_estaciones(args.estaciones_json)
    sesion = crear_sesion()

    parar = threading.Event()
    for senal in (signal.SIGINT, signal.SIGTERM):
        signal.signal(senal, lambda *_: parar.set())

    logger.info(
        "Configuración activa: estaciones=%d db=%s@%s:%s/%s intervalo=%ss",
        len(estaciones),
        config_conexion["user"],
        config_conexion["host"],
        config_conexion["port"],
        config_conexion["dbname"],
        args.interval,
    )

    while not parar.is_set():
        try:
            ejecutar_ciclo(config_conexion, sesion, estaciones, args.pausa, args.timeout, parar)
        except psycopg.Error as e:
            logger.error("Ciclo abortado por error de base de datos: %s", e)

        if args.interval <= 0:
            break
        logger.info("En espera de %d segundos hasta el próximo ciclo", args.interval)
        parar.wait(args.interval)


if __name__ == "__main__":
    main()
