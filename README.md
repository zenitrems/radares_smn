Descargar imagenes de radar y mostrarlas en web

```bash
export SONDEOS_DIR=/ruta/a/sondeos
python descarga_sondeos.py            # escribe ahí
cd web && npm run build && npm start  # sirve desde ahí
```

En la web, `SONDEOS_DIR` puede ser absoluta o relativa al proceso de Node (que
corre en `web/`), por ejemplo `SONDEOS_DIR=../sondeos`.

## Capas del INEGI

La consola no carga mapa base de teselas: la referencia geográfica la dibujan
GeoJSON propios, así que el escenario no depende de un CDN externo y nada
compite con los ecos. Todos salen del WFS del INEGI —no del WMS del visor, que
sólo entrega imágenes ya pintadas y no se puede colorear municipio a municipio:

```bash
python descarga_inegi.py                    # todas
python descarga_inegi.py localidades costa  # sólo algunas
```

| capa | features | archivo en `web/public/geo/` |
|---|---|---|
| `municipios` | 130 | `municipios_peninsula.geojson` · 2.7 MB |
| `localidades` | 1602 | `localidades_peninsula.geojson` · 0.41 MB |
| `costa` | 155 | `costa_peninsula.geojson` · 0.09 MB |
| `aeropuertos` | 13 | `aeropuertos_peninsula.geojson` · 4 KB |

Las cuatro se encienden desde el panel lateral y cada GeoJSON se descarga la
primera vez que su casilla se enciende. Los archivos se versionan en el repo y
Next los sirve como assets estáticos; basta reejecutar el script cuando el INEGI
publique marco nuevo.

Municipios y localidades se filtran por clave de entidad (`CVE_ENT`: 04
Campeche, 23 Quintana Roo, 31 Yucatán); costa y aeropuertos, que no la traen
útil, se recortan con la caja del escenario —la unión de los `bounds` de los
productos de radar—, para que la costa no se corte donde empieza el alcance.

Las localidades llegan como la traza de su mancha urbana. El script guarda el
centroide y el área, que a falta de población en el WFS es el único criterio
objetivo para decidir a qué zoom aparece cada rótulo: en zoom 7 se rotulan 7
localidades de toda la península y en zoom 9 unas 52, siempre acotadas al
encuadre visible y con un tope de 90 marcadores.

Para el mapeo de lluvia, `MapaRadar` acepta `lluvia`: un objeto **CVEGEO → mm·h⁻¹**
con la clave de 5 dígitos del INEGI. Los municipios con dato se rellenan con la
escala del SMN (`web/src/lib/municipios.js`), los demás quedan sólo con su
trazo para no tapar los ecos. `onMunicipio` recibe las propiedades del municipio
al hacer clic.
