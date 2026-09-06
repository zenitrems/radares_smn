# radares SMN

Descarga, almacenamiento y visualización de los productos de radar del Servicio Meteorológico Nacional (SMN), con foco en la península de Yucatán.

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
# web/.env.local
SONDEOS_DIR=../sondeos
NEXT_PUBLIC_MAPBOX_TOKEN=
```

```bash
npm install
npm run dev
```

## Capas del INEGI

El escenario se dibuja con GeoJSON del servicio WFS, filtrados y recortados con `descarga_inegi.py`. Se guardan en `web/public/geo/` y se declaran en `web/src/mapa/capas.json`.

```bash
python descarga_inegi.py                    # las capas activas
python descarga_inegi.py aeropuertos        # también las desactivadas, por nombre
```

| capa                                   | features | archivo en `web/public/geo/`           |
| -------------------------------------- | -------- | -------------------------------------- |
| `municipios`                           | 271      | `municipios_sureste.geojson` · 6.6 MB  |
| `localidades`                          | 6807     | `localidades_sureste.geojson` · 1.8 MB |
| `costa`                                | 162      | `costa_sureste.geojson` · 0.09 MB      |
| `aeropuertos` _(descarga desactivada)_ | 13       | `aeropuertos_peninsula.geojson` · 4 KB |

Municipios y localidades se filtran por `CVE_ENT`; costa y aeropuertos, que no la traen útil,
se recortan con la caja del escenario.

Las localidades llegan como la traza de su mancha urbana. El script guarda el
centroide y el área, que a falta de población en el WFS es el único criterio
objetivo para decidir a qué zoom aparece cada rótulo. Los umbrales por zoom
están en `web/src/components/CapaLocalidades.js` y son deliberadamente
generosos: de lo que sobre se encarga el _decluttering_ de OpenLayers, que
descarta el rótulo que se solapa con otro y da preferencia a la localidad de
mayor mancha urbana.

## El escenario

El mapa es **OpenLayers**. `web/src/components/MapaRadar.js` crea el `ol/Map` y
declara como hijos lo que hay encima; cada `Capa*` da de alta su capa OL
mientras esté montada y no pinta DOM. El poco pegamento con React —el contexto
del mapa y `useCapa`— está en `web/src/mapa/`, junto con la conversión de
coordenadas (`geo.js`), el orden de apilado y los estilos de los rótulos
(`estilos.js`), que se dibujan en el lienzo y no en CSS.

Los sondeos se colocan como `ImageStatic` sobre el extent del producto, ya en la
proyección de la vista: son recortes en Mercator, así que no hay reproyección
que pagar. Hay una capa por sitio y lo que se cambia al avanzar el reproductor
es su fuente; se conservan vivas las de los sondeos vecinos y las de los
extremos, que es adonde salta el reproductor al terminar.

Para el mapeo de lluvia, `MapaRadar` acepta `lluvia`: un objeto **CVEGEO → mm·h⁻¹**
con la clave de 5 dígitos del INEGI. Los municipios con dato se rellenan con la
escala del SMN (`web/src/lib/municipios.js`), los demás quedan sólo con su
trazo para no tapar los ecos. `onMunicipio` recibe las propiedades del municipio
al hacer clic.
