# Avisos, fuentes y términos de los datos

El [LICENSE](LICENSE) de este repositorio (MIT) cubre **únicamente el código**:
los scripts de Python, la consola de Next.js y su configuración. No cubre —ni
podría— la información que el proyecto descarga o redistribuye: esa pertenece a
sus fuentes y conserva sus propios términos, que se resumen abajo.

Quien reutilice este proyecto es responsable de cumplir los términos de cada
fuente. Los enlaces son la referencia; este archivo es sólo un resumen y puede
quedar desactualizado.

## Proyecto no oficial

Este es un proyecto independiente, sin relación, respaldo, patrocinio ni
supervisión del Servicio Meteorológico Nacional (SMN), de la Comisión Nacional
del Agua (CONAGUA) ni del Instituto Nacional de Estadística y Geografía
(INEGI). No usa sus logotipos ni su identidad gráfica, y nada de lo que muestra
debe entenderse como una postura o publicación oficial de esas instituciones.

**No es apto para la toma de decisiones de seguridad, operación aeronáutica o
protección civil.** Para eso están los avisos y pronósticos oficiales del SMN.
La consola puede mostrar sondeos incompletos, retrasados o mal georreferenciados
sin advertirlo.

## Productos de radar — SMN / CONAGUA

- Fuente: <https://smn.conagua.gob.mx/> (visor de radares, `tools/GUI/visor_radares_v3`).
- Términos que el sitio declara en su pie: <https://www.gob.mx/terminos>.
  Autorizan **visualizar y descargar los materiales para uso personal y no
  comercial**, y prohíben modificarlos, reproducirlos o mostrarlos pública o
  comercialmente, distribuirlos o transferirlos a terceros.
- Por eso `descarga_sondeos.py` es un cliente de descarga, no un espejo: **este
  repositorio no incluye ni redistribuye ninguna imagen del SMN**. Los sondeos
  se bajan en la máquina de quien ejecuta el script y `sondeos/`,
  `sondeos_gif/` y `sondeos_archivo/` están en `.gitignore`.
- En consecuencia, este proyecto se publica como herramienta de consulta
  personal. Exponer la consola en internet, redistribuir los sondeos o darles
  cualquier uso comercial va más allá de lo que esos términos autorizan: hay que
  pedir autorización al SMN (ventanilla única: ventanillaunica.smn@conagua.gob.mx).
- El script consulta con una cadencia conservadora (por omisión, cada 300 s,
  ajustable con `--interval`) y no debe usarse para descargas masivas ni
  agresivas: el SMN publica un sondeo cada 6-10 minutos, así que pedir más
  seguido no trae nada nuevo.

## Capas vectoriales — INEGI

- Fuente: servicio WFS <https://mapas.inegi.org.mx/geoserver/wfs>, descargado
  con `descarga_inegi.py`.
- Términos de Libre Uso de la Información del INEGI:
  <https://www.inegi.org.mx/inegi/terminos.html>. Permiten extraer, adaptar y
  reordenar la información dando los créditos correspondientes, con la
  obligación de notificar al usuario final cualquier análisis o transformación
  hecha a la información, y sin aparentar que ese trabajo, o el uso que se le da,
  es una postura oficial del INEGI o está avalado por él.
- Los archivos en `web/public/geo/` **son obra derivada**: se filtran por
  `CVE_ENT` o se recortan con la caja del escenario, y en el caso de las
  localidades se sustituye la traza de la mancha urbana por su centroide y su
  área calculada. Ni el filtrado, ni el recorte, ni el centroide, ni el área son
  del INEGI.
- Crédito de la fuente: Fuente: INEGI, Marco Geoestadístico y capas
  topográficas, servicio WFS. Datos filtrados y procesados por este proyecto.

## Mapas base — Mapbox / OpenStreetMap

- Teselas de <https://www.mapbox.com/> sobre datos de
  <https://www.openstreetmap.org/copyright>, usadas con el token de quien
  despliega (`NEXT_PUBLIC_MAPBOX_TOKEN`, fuera del repositorio) y sujetas a los
  términos de Mapbox. La atribución exigida se pinta en el mapa.
- Los mapas base son opcionales: sin token, la consola funciona sólo con los
  vectores.

## Escala de color

La escala de reflectividad y la de lluvia acumulada reproducen las del SMN para
que un sondeo se lea igual que en la fuente. Es interoperabilidad, no una
imitación de su identidad institucional.
