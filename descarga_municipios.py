"""
Descarga la división municipal desde el WFS del INEGI.
en este caso sólo de la península de Yucatán (Campeche, Quintana Roo y Yucatán).

"""

import json
import os

import requests

WFS = "https://mapas.inegi.org.mx/geoserver/wfs"
CAPA = "Sitio_Inegi:mg_Municipal"

ENTIDADES = {"04": "Campeche", "23": "Quintana Roo", "31": "Yucatán"}

# Se sirve como asset estático de Next
SALIDA = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "web",
    "public",
    "geo",
    "municipios_peninsula.geojson",
)


def descarga():
    filtro = "CVE_ENT IN (%s)" % ",".join("'%s'" % c for c in ENTIDADES)
    r = requests.get(
        WFS,
        params={
            "service": "WFS",
            "version": "1.1.0",
            "request": "GetFeature",
            "typeName": CAPA,
            "outputFormat": "application/json",
            "srsName": "EPSG:4326",
            "CQL_FILTER": filtro,
        },
        timeout=300,
    )
    r.raise_for_status()
    return r.json()


def limpia_anillo(anillo):
    """Quita vértices repetidos consecutivos (el WFS trae ~31 mil) y cierra el anillo."""
    salida = []
    for punto in anillo:
        if not salida or punto != salida[-1]:
            salida.append(punto)
    if len(salida) > 1 and salida[0] != salida[-1]:
        salida.append(salida[0])
    return salida


def normaliza(fc):
    """Deja sólo las propiedades que la web usa y añade el nombre del estado."""
    for f in fc["features"]:
        p = f["properties"]
        cve = p["CVEGEO"]
        g = f["geometry"]
        poligonos = (
            g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        )
        for poligono in poligonos:
            for i, anillo in enumerate(poligono):
                poligono[i] = limpia_anillo(anillo)
        f["id"] = cve
        f["properties"] = {
            "CVEGEO": cve,  # clave de 5 dígitos: entidad+municipio
            "NOMGEO": p["NOMGEO"],
            "CVE_ENT": p["CVE_ENT"],
            "NOM_ENT": ENTIDADES[p["CVE_ENT"]],
        }
    fc["features"].sort(key=lambda f: f["properties"]["CVEGEO"])
    fc.pop("crs", None)
    fc.pop("totalFeatures", None)
    fc.pop("numberMatched", None)
    fc.pop("numberReturned", None)
    fc.pop("timeStamp", None)
    return fc


if __name__ == "__main__":
    fc = normaliza(descarga())
    os.makedirs(os.path.dirname(SALIDA), exist_ok=True)
    with open(SALIDA, "w", encoding="utf-8") as fh:
        json.dump(fc, fh, ensure_ascii=False, separators=(",", ":"))

    tam = os.path.getsize(SALIDA) / 1e6
    por_estado = {}
    for f in fc["features"]:
        por_estado.setdefault(f["properties"]["NOM_ENT"], 0)
        por_estado[f["properties"]["NOM_ENT"]] += 1
    print(
        "%s: %d municipios %s — %.1f MB"
        % (SALIDA, len(fc["features"]), por_estado, tam)
    )
