"""
Descarga las capas del INEGI que usa la consola, desde su WFS.

El visor del INEGI publica todo por WMS —imágenes ya pintadas—, y eso no sirve
aquí: la consola necesita vectores para colorear municipios por lluvia, rotular
localidades y dibujar la costa sin depender de un mapa base de teselas. El mismo
GeoServer expone WFS, así que las capas salen de ahí en GeoJSON y EPSG:4326.

    python descarga_inegi.py                      # todas
    python descarga_inegi.py localidades costa    # sólo algunas

Los archivos van a web/public/geo/ y se versionan en el repositorio: son datos
que sólo cambian cuando el INEGI publica marco nuevo, al revés que los sondeos.

Dos trampas del servicio, por si se añaden capas:

  * `GetCapabilities` con version=2.0.0 responde sin FeatureTypeList; para
    listar las 2134 capas hay que pedir version=1.1.0.
  * Varias capas están guardadas en coordenadas proyectadas, así que un
    `BBOX(geom,x0,y0,x1,y1)` sin CRS devuelve cero features en silencio. Hay que
    cerrar el filtro con el CRS: BBOX(geom,...,'EPSG:4326').
"""

import argparse
import json
import math
import os
import sys

import requests

WFS = "https://mapas.inegi.org.mx/geoserver/wfs"

# El escenario ya no es sólo la península: los productos de 450 km de Sabancuy
# cubren Tabasco y buena parte de Chiapas, y ahí también cae lluvia que hay que
# poder atribuir a un municipio.
ENTIDADES = {
    "04": "Campeche",
    "07": "Chiapas",
    "23": "Quintana Roo",
    "27": "Tabasco",
    "31": "Yucatán",
}

# Escenario de la consola: la unión de los `bounds` de los productos de radar
# (Sabancuy 450 km y Cancún 300 km) con algo de aire, y bajando lo suficiente
# para no cortar Chiapas. Las capas que no traen clave de entidad se recortan
# con esta caja, para que la costa y la frontera no se corten justo donde
# empieza el alcance del radar.
CAJA = (-95.8, 14.3, -83.8, 23.9)

DESTINO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web", "public", "geo")

KM_POR_GRADO = 111.32


def por_entidad(campo="CVE_ENT"):
    return "%s IN (%s)" % (campo, ",".join("'%s'" % c for c in ENTIDADES))


def por_caja(geom):
    return "BBOX(%s,%f,%f,%f,%f,'EPSG:4326')" % ((geom,) + CAJA)


# --------------------------------------------------------------------------
# Utilidades de geometría
# --------------------------------------------------------------------------

def anillos(geometria):
    """Los anillos exteriores de una geometría de área, sea Polygon o Multi."""
    if geometria["type"] == "MultiPolygon":
        return [p[0] for p in geometria["coordinates"]]
    if geometria["type"] == "Polygon":
        return [geometria["coordinates"][0]]
    return []


def area_grados(anillo):
    """Área del anillo por la fórmula del zapatero, en grados² (sólo para comparar)."""
    s = 0.0
    for (x0, y0), (x1, y1) in zip(anillo, anillo[1:]):
        s += x0 * y1 - x1 * y0
    return abs(s) / 2


def area_km2(anillo):
    """Área aproximada: los grados de longitud se acortan con el coseno de la latitud."""
    if len(anillo) < 4:
        return 0.0
    lat = sum(p[1] for p in anillo) / len(anillo)
    return area_grados(anillo) * KM_POR_GRADO ** 2 * abs(math.cos(math.radians(lat)))


def centroide(anillo):
    """Centroide del polígono (no del promedio de vértices, que se sesga donde hay detalle)."""
    cx = cy = a = 0.0
    for (x0, y0), (x1, y1) in zip(anillo, anillo[1:]):
        f = x0 * y1 - x1 * y0
        a += f
        cx += (x0 + x1) * f
        cy += (y0 + y1) * f
    if a == 0:  # anillo degenerado: cae al promedio simple
        return [round(sum(p[0] for p in anillo) / len(anillo), 5),
                round(sum(p[1] for p in anillo) / len(anillo), 5)]
    a *= 3
    return [round(cx / a, 5), round(cy / a, 5)]


def limpia_anillo(anillo):
    """Quita vértices repetidos consecutivos (el WFS trae decenas de miles) y cierra el anillo."""
    salida = []
    for punto in anillo:
        if not salida or punto != salida[-1]:
            salida.append(punto)
    if len(salida) > 1 and salida[0] != salida[-1]:
        salida.append(salida[0])
    return salida


def limpia_areas(geometria):
    partes = geometria["coordinates"] if geometria["type"] == "MultiPolygon" else [geometria["coordinates"]]
    for poligono in partes:
        for i, anillo in enumerate(poligono):
            poligono[i] = limpia_anillo(anillo)
    return geometria


def limpia_lineas(geometria):
    partes = geometria["coordinates"] if geometria["type"] == "MultiLineString" else [geometria["coordinates"]]
    for i, linea in enumerate(partes):
        salida = [p for j, p in enumerate(linea) if j == 0 or p != linea[j - 1]]
        partes[i] = salida
    return geometria


# --------------------------------------------------------------------------
# Normalizadores: qué se guarda de cada capa
# --------------------------------------------------------------------------

def municipio(f):
    p = f["properties"]
    limpia_areas(f["geometry"])
    return p["CVEGEO"], {
        "CVEGEO": p["CVEGEO"],          # clave de 5 dígitos: entidad + municipio
        "NOMGEO": p["NOMGEO"],
        "CVE_ENT": p["CVE_ENT"],
        "NOM_ENT": ENTIDADES[p["CVE_ENT"]],
    }


def localidad(f):
    """
    El INEGI entrega las localidades como la traza de su mancha urbana. Para la
    consola sólo hace falta un punto donde colgar el rótulo, así que se guarda
    el centroide y el área queda como medida del tamaño del asentamiento: no hay
    población en esta capa (ni en las del censo publicadas por WFS), y el área
    es el único criterio objetivo para decidir a qué zoom aparece cada nombre.
    """
    p = f["properties"]
    exteriores = anillos(f["geometry"])
    mayor = max(exteriores, key=area_grados)
    f["geometry"] = {"type": "Point", "coordinates": centroide(mayor)}
    return p["CVEGEO"], {
        "CVEGEO": p["CVEGEO"],          # 9 dígitos: entidad + municipio + localidad
        "NOMGEO": p["NOMGEO"],
        "CVE_ENT": p["CVE_ENT"],
        "NOM_ENT": ENTIDADES[p["CVE_ENT"]],
        "AMBITO": p["AMBITO"],          # 'Urbana' | 'Rural'
        "area_km2": round(sum(area_km2(a) for a in exteriores), 3),
    }


def costa(f):
    p = f["properties"]
    limpia_lineas(f["geometry"])
    # 'Linea de costa' o 'Frontera': la consola las dibuja distinto.
    return str(p["objectid"]), {"tipo": p["tipo"], "CVE_ENT": p["cve_ent"]}


def aeropuerto(f):
    p = f["properties"]
    # `nombre` viene 'N/D' en casi todos; el nombre real está en `completo`.
    return str(p["gid"]), {
        "nombre": p["completo"],
        "lugar": p["lugar"],
        "tipo": p["tipo"],              # 'Internacional' | 'Nacional'
    }


CAPAS = {
    "municipios": {
        "typename": "Sitio_Inegi:mg_Municipal",
        "filtro": por_entidad(),
        "normaliza": municipio,
        "salida": "municipios_sureste.geojson",
        "que_es": "división municipal",
    },
    "localidades": {
        "typename": "Sitio_Inegi:mg_Localidades",
        "filtro": por_entidad(),
        "normaliza": localidad,
        "salida": "localidades_sureste.geojson",
        "que_es": "localidades como punto, con área de la mancha urbana",
        # Son las localidades amanzanadas (1602 en la península). Los caseríos
        # rurales sin traza urbana viven aparte, en
        # geografia:pi_mgn_localidades_geoestadisticas_no_amanzanadas: 19011
        # puntos más, demasiados para rotular en la consola.
    },
    "costa": {
        "typename": "Sitio_Inegi:tr_limitesnacionales_lineacostafrontera_1m",
        "filtro": por_caja("geom"),
        "normaliza": costa,
        "salida": "costa_sureste.geojson",
        "que_es": "línea de costa y frontera, generalización 1:1 000 000",
    },
    "aeropuertos": {
        "typename": "Sitio_Inegi:aeropuertos",
        "filtro": por_caja("the_geom"),
        "normaliza": aeropuerto,
        "salida": "aeropuertos_peninsula.geojson",
        "que_es": "aeropuertos nacionales e internacionales",
        # Descarga desactivada: el archivo que ya está en web/public/geo se
        # conserva y la capa sigue funcionando en la consola. Conserva el
        # nombre `_peninsula` porque su contenido es el de la caja anterior;
        # `python descarga_inegi.py aeropuertos` lo regenera con la caja de hoy.
        "activa": False,
    },
}


def descarga(capa):
    r = requests.get(WFS, params={
        "service": "WFS",
        "version": "1.1.0",
        "request": "GetFeature",
        "typeName": capa["typename"],
        "outputFormat": "application/json",
        "srsName": "EPSG:4326",
        "CQL_FILTER": capa["filtro"],
    }, timeout=600)
    r.raise_for_status()
    return r.json()


def procesa(capa, fc):
    for f in fc["features"]:
        f["id"], f["properties"] = capa["normaliza"](f)
    fc["features"].sort(key=lambda f: f["id"])
    for sobra in ("crs", "totalFeatures", "numberMatched", "numberReturned", "timeStamp", "links"):
        fc.pop(sobra, None)
    return fc


def escribe(capa, fc):
    ruta = os.path.join(DESTINO, capa["salida"])
    os.makedirs(DESTINO, exist_ok=True)
    with open(ruta, "w", encoding="utf-8") as fh:
        json.dump(fc, fh, ensure_ascii=False, separators=(",", ":"))
    return ruta, os.path.getsize(ruta)


def main(nombres):
    for nombre in nombres:
        capa = CAPAS[nombre]
        fc = procesa(capa, descarga(capa))
        ruta, tam = escribe(capa, fc)
        print("%-12s %4d features  %6.2f MB  %s" % (
            nombre, len(fc["features"]), tam / 1e6, os.path.relpath(ruta)))


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[1],
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("capas", nargs="*", default=None,
                    help="capas a descargar; sin argumentos, las activas. Disponibles: " +
                         ", ".join("%s%s" % (n, "" if c.get("activa", True) else " (desactivada)")
                                   for n, c in CAPAS.items()))
    args = ap.parse_args()

    # Sin argumentos se bajan sólo las capas activas; nombrarlas explícitamente
    # descarga cualquiera, activa o no.
    nombres = args.capas or [n for n, c in CAPAS.items() if c.get("activa", True)]
    desconocidas = [n for n in nombres if n not in CAPAS]
    if desconocidas:
        sys.exit("capa desconocida: %s (disponibles: %s)" % (", ".join(desconocidas), ", ".join(CAPAS)))
    main(nombres)
