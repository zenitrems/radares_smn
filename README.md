# radares SMN

Descarga, almacenamiento y visualización de los productos de radar del Servicio Meteorológico Nacional (SMN) de México, con foco en la península de Yucatán.

## Descarga de sondeos

```bash
python3 descarga_sondeos.py --help
```

Descarga los sondeos de las estaciones CANCUN y SABANCUY, hasta 100 imágenes de historia, con intervalo de 150s, y almacenamiento en `sondeos/`

```bash
python3 descarga_sondeos.py --estaciones CANC,SABA --max-imagenes 100 --interval 150 --gif-dir sondeos
```

## Web console /web

En la web, `SONDEOS_DIR` puede ser absoluta o relativa al proceso de Node (que
corre en `web/`), por ejemplo `SONDEOS_DIR=../sondeos`.

```bash
export SONDEOS_DIR=/ruta/a/sondeos
npm install
npm run dev
```

## Capas del INEGI

Se utiliza el WFS del INEGI para descargar las capas de municipios, localidades, costa y aeropuertos de la península de Yucatán. El script `descarga_inegi.py` descarga y guarda los GeoJSON en `web/public/geo/` para que Next los sirva estáticamente.

```bash
python descarga_inegi.py                    # todas
python descarga_inegi.py localidades costa  # sólo algunas
```

| capa          | features | archivo en `web/public/geo/`              |
| ------------- | -------- | ----------------------------------------- |
| `municipios`  | 130      | `municipios_peninsula.geojson` · 2.7 MB   |
| `localidades` | 1602     | `localidades_peninsula.geojson` · 0.41 MB |
| `costa`       | 155      | `costa_peninsula.geojson` · 0.09 MB       |
| `aeropuertos` | 13       | `aeropuertos_peninsula.geojson` · 4 KB    |

Municipios y localidades se filtran por clave de entidad (`CVE_ENT`: 04
Campeche, 23 Quintana Roo, 31 Yucatán); costa y aeropuertos, que no la traen
útil, se recortan con la caja del escenario.

Las localidades llegan como la traza de su mancha urbana. El script guarda el
centroide y el área, que a falta de población en el WFS es el único criterio
objetivo para decidir a qué zoom aparece cada rótulo: en zoom 7 se rotulan 7
localidades de toda la península y en zoom 9 unas 52, siempre acotadas al
encuadre visible y con un tope de 90 marcadores.

Para el mapeo de lluvia, `MapaRadar` acepta `lluvia`: un objeto **CVEGEO → mm·h⁻¹**
con la clave de 5 dígitos del INEGI. Los municipios con dato se rellenan con la
escala del SMN (`web/src/lib/municipios.js`), los demás quedan sólo con su
trazo para no tapar los ecos. `onMunicipio` recibe las propiedades del municipio al hacer clic.
