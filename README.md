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

El escenario se dibuja con GeoJSON propios, no con teselas: así no depende de
ningún servicio externo y nada compite con los ecos. Todos salen del WFS del
INEGI —no del WMS del visor, que sólo entrega imágenes ya pintadas y no se puede
colorear municipio a municipio:

```bash
python descarga_inegi.py                    # las capas activas
python descarga_inegi.py aeropuertos        # también las desactivadas, por nombre
```

| capa | features | archivo en `web/public/geo/` |
|---|---|---|
| `municipios` | 271 | `municipios_sureste.geojson` · 6.6 MB |
| `localidades` | 6807 | `localidades_sureste.geojson` · 1.8 MB |
| `costa` | 162 | `costa_sureste.geojson` · 0.09 MB |
| `aeropuertos` *(descarga desactivada)* | 13 | `aeropuertos_peninsula.geojson` · 4 KB |

Cubren cinco entidades —Campeche (04), Chiapas (07), Quintana Roo (23), Tabasco
(27) y Yucatán (31)—: los productos de 450 km de Sabancuy llegan hasta ahí y la
lluvia que cae también hay que poder atribuirla a un municipio. Municipios y
localidades se filtran por `CVE_ENT`; costa y aeropuertos, que no la traen útil,
se recortan con la caja del escenario.

La descarga de `aeropuertos` está desactivada (`"activa": False`): el archivo se
conserva y la capa sigue funcionando: por eso mantiene el nombre `_peninsula`,
que es el recorte con el que se generó.

Las localidades llegan como la traza de su mancha urbana. El script guarda el
centroide y el área, que a falta de población en el WFS es el único criterio
objetivo para decidir a qué zoom aparece cada rótulo, siempre acotado al
encuadre visible y a un tope de 90 marcadores.

## Mapas base

Además de los vectores, la consola puede poner teselas por debajo. El catálogo
está en `web/src/lib/mapas.js` y añadir un proveedor es una entrada más. Por
omisión no hay ninguno.

Los estilos satelitales son de Mapbox y necesitan credencial; sin ella la opción
aparece deshabilitada en el panel y todo lo demás funciona igual:

```bash
# web/.env.local  (ignorado por git)
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ...
```

## Panel y arranque

El panel lateral se pliega con el botón del encabezado o con la tecla **P**. La
consola arranca en **Cancún / CMAX**; si ese producto no tiene sondeos en disco,
cae al más reciente que haya.

Para el mapeo de lluvia, `MapaRadar` acepta `lluvia`: un objeto **CVEGEO → mm·h⁻¹**
con la clave de 5 dígitos del INEGI. Los municipios con dato se rellenan con la
escala del SMN (`web/src/lib/municipios.js`), los demás quedan sólo con su
trazo para no tapar los ecos. `onMunicipio` recibe las propiedades del municipio
al hacer clic.
