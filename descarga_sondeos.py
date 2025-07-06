import os
import json
import requests
import re

ESTACIONES = ["CANC", "SABA"]
RDA_REPOSITORY = "https://smn.conagua.gob.mx/tools/PHP/RDA/static/php/RDA_repository.php?dir=ecos&type=json"
GIF_REPOSITORY = "https://smn.conagua.gob.mx/tools/GUI/visor_radares_v3/ecos"
GIF_DIR_BASE = "sondeos"  # directorio base para la estructura /sondeos/estacion/tipo

def get_sondeo_radares():
    try:
        response = requests.get(RDA_REPOSITORY, timeout=15)
        response.raise_for_status()
        sondeos = json.loads(response.content)
        print(f"OK, Tiempo transcurrido: {response.elapsed}")

        sondeos_CANC, sondeos_SABA = filtrar_sondeos_por_estacion(sondeos)

        descargar_y_guardar_sondeos(sondeos_CANC)
        descargar_y_guardar_sondeos(sondeos_SABA)

    except requests.exceptions.RequestException as e:
        print(f"Ocurrió un error al hacer la solicitud: {e}")

def filtrar_sondeos_por_estacion(sondeos):
    sondeos_CANC = [s for s in sondeos if s.startswith("CANC")]
    sondeos_SABA = [s for s in sondeos if s.startswith("SABA")]
    return sondeos_CANC, sondeos_SABA

def extraer_tipo_sondeo(nombre):
    """
    Extrae el tipo de producto del nombre del sondeo.
    Ejemplo: 'CANC_PPIX_VELO_120_P003_20250704_224405' -> 'PPIX_VELO_120'
    """
    partes = nombre.split("_")
    if len(partes) >= 4:
        return "_".join(partes[1:4]) if partes[1] == "PPIX" else "_".join(partes[1:3])
    return "UNKNOWN"

def descargar_y_guardar_sondeos(sondeos):
    for sondeo in sondeos:
        estacion = sondeo.split("_")[0]
        tipo = extraer_tipo_sondeo(sondeo)
        directorio = os.path.join(GIF_DIR_BASE, estacion, tipo)
        os.makedirs(directorio, exist_ok=True)

        url = f"{GIF_REPOSITORY}/{sondeo}"
        destino = os.path.join(directorio, sondeo)

        if os.path.exists(destino):
            print(f"Ya existe: {destino}")
            continue

        try:
            response = requests.get(url, timeout=15)
            response.raise_for_status()

            with open(destino, "wb") as gif_file:
                gif_file.write(response.content)

            print(f"Guardado: {destino}")

        except requests.exceptions.RequestException as e:
            print(f"Error al descargar {sondeo}: {e}")

get_sondeo_radares()
