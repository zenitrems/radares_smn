import argparse
import json
import logging
import os
import re
import shutil
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional

import requests

DEFAULT_ESTACIONES = ["CANC"]  # "CANC", "SABA"
DEFAULT_RDA_REPOSITORY = "https://smn.conagua.gob.mx/tools/PHP/RDA/static/php/RDA_repository.php?dir=ecos&type=json"
DEFAULT_GIF_REPOSITORY = "https://smn.conagua.gob.mx/tools/GUI/visor_radares_v3/ecos"
# Mismo directorio que sirve la web (src/lib/almacen.js); --gif-dir lo sobreescribe.
DEFAULT_GIF_DIR_BASE = os.environ.get("SONDEOS_DIR", "web/public/sondeos")
DEFAULT_ARCHIVE_DIR_BASE = "sondeos_archivo"
DEFAULT_MAX_IMAGENES = 25
DEFAULT_INTERVAL = 300

logger = logging.getLogger("descarga_sondeos")


@dataclass
class DescargaConfig:
    estaciones: List[str] = field(default_factory=lambda: list(DEFAULT_ESTACIONES))
    rda_repository: str = DEFAULT_RDA_REPOSITORY
    gif_repository: str = DEFAULT_GIF_REPOSITORY
    gif_dir_base: str = DEFAULT_GIF_DIR_BASE
    archive_dir_base: str = DEFAULT_ARCHIVE_DIR_BASE
    max_imagenes: int = DEFAULT_MAX_IMAGENES
    interval: int = DEFAULT_INTERVAL

    @classmethod
    def from_file(cls, path: str) -> "DescargaConfig":
        with open(path, "r", encoding="utf-8") as config_file:
            data = json.load(config_file)
        return cls(**data)


def configurar_logging(nivel: str, archivo: Optional[str] = None) -> None:
    handlers = [logging.StreamHandler()]
    if archivo:
        handlers.append(logging.FileHandler(archivo, encoding="utf-8"))

    logging.basicConfig(
        level=getattr(logging, nivel.upper(), logging.INFO),
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=handlers,
    )


def get_sondeo_radares(config: DescargaConfig) -> None:
    try:
        response = requests.get(config.rda_repository, timeout=15)
        response.raise_for_status()
        sondeos = json.loads(response.content)

        filtrados = [
            s for s in sondeos if any(s.startswith(e) for e in config.estaciones)
        ]
        logger.info(
            "Repositorio consultado: %d sondeos totales, %d coinciden con estaciones=%s",
            len(sondeos),
            len(filtrados),
            ", ".join(config.estaciones),
        )
        descargar_y_guardar_sondeos(filtrados, config)

    except requests.exceptions.RequestException as e:
        logger.error("Error al consultar el repositorio de sondeos: %s", e)


def extraer_tipo_sondeo(nombre: str) -> str:
    """
    Extrae el tipo de producto del nombre del sondeo.
    Ejemplo: 'CANC_PPIX_VELO_120_P003_20250704_224405' -> 'PPIX_VELO_120'
    """
    partes = nombre.split("_")
    if len(partes) >= 4:
        return "_".join(partes[1:4]) if partes[1] == "PPIX" else "_".join(partes[1:3])
    return "UNKNOWN"


def extraer_fecha_hora(nombre: str) -> Optional[datetime]:
    """Obtiene la fecha y hora de captura a partir del nombre de un sondeo."""
    m = re.search(r"_(\d{8})_(\d{6})\.gif$", nombre)
    if not m:
        return None
    fecha, hora = m.groups()
    try:
        return datetime.strptime(f"{fecha}{hora}", "%Y%m%d%H%M%S")
    except ValueError:
        return None


def mantener_limite_archivos(directorio: str, max_imagenes: int) -> None:
    archivos = sorted(f for f in os.listdir(directorio) if f.endswith(".gif"))
    while len(archivos) > max_imagenes:
        viejo = archivos.pop(0)
        os.remove(os.path.join(directorio, viejo))
        logger.debug("Archivo removido por límite de %d: %s", max_imagenes, viejo)


def descargar_y_guardar_sondeos(sondeos: List[str], config: DescargaConfig) -> None:
    for sondeo in sondeos:
        estacion = sondeo.split("_")[0]
        tipo = extraer_tipo_sondeo(sondeo)
        momento = extraer_fecha_hora(sondeo)
        momento_str = (
            momento.strftime("%Y-%m-%d %H:%M:%S") if momento else "desconocida"
        )

        # directorio donde se guardan las últimas imágenes para el GIF
        directorio = os.path.join(config.gif_dir_base, estacion, tipo)
        os.makedirs(directorio, exist_ok=True)

        url = f"{config.gif_repository}/{sondeo}"
        destino = os.path.join(directorio, sondeo)

        if os.path.exists(destino):
            logger.debug(
                "Omitido (ya existe) | estación=%s tipo=%s fecha=%s archivo=%s",
                estacion,
                tipo,
                momento_str,
                sondeo,
            )
            continue

        try:
            response = requests.get(url, timeout=15)
            response.raise_for_status()

            with open(destino, "wb") as gif_file:
                gif_file.write(response.content)

            # copiar al archivo histórico por fecha
            if momento:
                archivo_dir = os.path.join(
                    config.archive_dir_base, momento.strftime("%Y%m%d"), estacion, tipo
                )
                os.makedirs(archivo_dir, exist_ok=True)
                shutil.copy2(destino, os.path.join(archivo_dir, sondeo))

            # mantener solo los últimos max_imagenes en el directorio principal
            mantener_limite_archivos(directorio, config.max_imagenes)

            logger.info(
                "Descargado | estación=%s tipo=%s fecha=%s archivo=%s",
                estacion,
                tipo,
                momento_str,
                sondeo,
            )

        except requests.exceptions.RequestException as e:
            logger.error(
                "Error al descargar | estación=%s tipo=%s fecha=%s archivo=%s -> %s",
                estacion,
                tipo,
                momento_str,
                sondeo,
                e,
            )


def construir_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Descarga y archiva sondeos de radar del SMN"
    )
    parser.add_argument(
        "--config", help="Ruta a un archivo JSON con la configuración base"
    )
    parser.add_argument(
        "--estaciones", help="Lista separada por comas, ej. 'CANC,SABA'"
    )
    parser.add_argument("--rda-repository", help="URL del repositorio RDA")
    parser.add_argument("--gif-repository", help="URL base de los GIFs de sondeo")
    parser.add_argument(
        "--gif-dir", dest="gif_dir_base", help="Directorio de los GIFs activos"
    )
    parser.add_argument(
        "--archive-dir",
        dest="archive_dir_base",
        help="Directorio del archivo histórico por fecha",
    )
    parser.add_argument(
        "--max-imagenes",
        type=int,
        help="Máximo de imágenes a conservar por estación/tipo",
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=None,
        help="Segundos entre verificaciones (0 para ejecutar una sola vez)",
    )
    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        help="Nivel de detalle del log",
    )
    parser.add_argument(
        "--log-file", help="Ruta opcional para además escribir el log en un archivo"
    )
    return parser


def construir_config(args: argparse.Namespace) -> DescargaConfig:
    config = DescargaConfig.from_file(args.config) if args.config else DescargaConfig()

    if args.estaciones:
        config.estaciones = [e.strip() for e in args.estaciones.split(",") if e.strip()]
    if args.rda_repository:
        config.rda_repository = args.rda_repository
    if args.gif_repository:
        config.gif_repository = args.gif_repository
    if args.gif_dir_base:
        config.gif_dir_base = args.gif_dir_base
    if args.archive_dir_base:
        config.archive_dir_base = args.archive_dir_base
    if args.max_imagenes is not None:
        config.max_imagenes = args.max_imagenes
    if args.interval is not None:
        config.interval = args.interval

    return config


def main() -> None:
    args = construir_parser().parse_args()
    configurar_logging(args.log_level, args.log_file)
    config = construir_config(args)

    logger.info(
        "Configuración activa: estaciones=%s max_imagenes=%d gif_dir=%s archive_dir=%s intervalo=%ss",
        ", ".join(config.estaciones),
        config.max_imagenes,
        config.gif_dir_base,
        config.archive_dir_base,
        config.interval,
    )

    if config.interval <= 0:
        get_sondeo_radares(config)
    else:
        while True:
            get_sondeo_radares(config)
            logger.info(
                "En espera de %d segundos hasta la próxima verificación",
                config.interval,
            )
            time.sleep(config.interval)


if __name__ == "__main__":
    main()
