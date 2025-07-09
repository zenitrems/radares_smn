import os
import json
import requests
import re
import time
import argparse
import shutil

ESTACIONES = ["CANC", "SABA"]
RDA_REPOSITORY = "https://smn.conagua.gob.mx/tools/PHP/RDA/static/php/RDA_repository.php?dir=ecos&type=json"
GIF_REPOSITORY = "https://smn.conagua.gob.mx/tools/GUI/visor_radares_v3/ecos"

# directorio base para los GIFs usados en los compositos
GIF_DIR_BASE = "sondeos"
# directorio donde se almacenan todos los GIFs descargados clasificados por día
ARCHIVE_DIR_BASE = "sondeos_archivo"

# máximo de archivos a conservar por estación/tipo para crear el GIF
MAX_IMAGENES = 25


def get_sondeo_radares():
    try:
        response = requests.get(RDA_REPOSITORY, timeout=15)
        response.raise_for_status()
        sondeos = json.loads(response.content)

        filtrados = [s for s in sondeos if any(s.startswith(e) for e in ESTACIONES)]
        descargar_y_guardar_sondeos(filtrados)

    except requests.exceptions.RequestException as e:
        print(f"Ocurrió un error al hacer la solicitud: {e}")


def extraer_tipo_sondeo(nombre):
    """
    Extrae el tipo de producto del nombre del sondeo.
    Ejemplo: 'CANC_PPIX_VELO_120_P003_20250704_224405' -> 'PPIX_VELO_120'
    """
    partes = nombre.split("_")
    if len(partes) >= 4:
        return "_".join(partes[1:4]) if partes[1] == "PPIX" else "_".join(partes[1:3])
    return "UNKNOWN"


def extraer_fecha(nombre):
    """Obtiene la fecha (YYYYMMDD) de un nombre de sondeo."""
    m = re.search(r"_(\d{8})_\d{6}\.gif$", nombre)
    return m.group(1) if m else None


def mantener_limite_archivos(directorio):
    archivos = sorted([f for f in os.listdir(directorio) if f.endswith(".gif")])
    while len(archivos) > MAX_IMAGENES:
        viejo = archivos.pop(0)
        os.remove(os.path.join(directorio, viejo))


def descargar_y_guardar_sondeos(sondeos):
    for sondeo in sondeos:
        estacion = sondeo.split("_")[0]
        tipo = extraer_tipo_sondeo(sondeo)

        # directorio donde se guardan las últimas imágenes para el GIF
        directorio = os.path.join(GIF_DIR_BASE, estacion, tipo)
        os.makedirs(directorio, exist_ok=True)

        url = f"{GIF_REPOSITORY}/{sondeo}"
        destino = os.path.join(directorio, sondeo)

        if os.path.exists(destino):
            # ya descargado previamente
            continue

        try:
            response = requests.get(url, timeout=15)
            response.raise_for_status()

            with open(destino, "wb") as gif_file:
                gif_file.write(response.content)

            # copiar al archivo histórico por fecha
            fecha = extraer_fecha(sondeo)
            if fecha:
                archivo_dir = os.path.join(ARCHIVE_DIR_BASE, fecha, estacion, tipo)
                os.makedirs(archivo_dir, exist_ok=True)
                shutil.copy2(destino, os.path.join(archivo_dir, sondeo))

            # mantener solo los últimos MAX_IMAGENES en directorio principal
            mantener_limite_archivos(directorio)

            print(f"Guardado: {destino}")

        except requests.exceptions.RequestException as e:
            print(f"Error al descargar {sondeo}: {e}")


def main():
    parser = argparse.ArgumentParser(description="Descarga y archiva sondeos")
    parser.add_argument(
        "--interval",
        type=int,
        default=300,
        help="Segundos entre verificaciones (0 para ejecutar una sola vez)",
    )
    args = parser.parse_args()

    if args.interval <= 0:
        get_sondeo_radares()
    else:
        while True:
            get_sondeo_radares()
            print("sleep")
            time.sleep(args.interval)


if __name__ == "__main__":
    main()
