Descargar imagenes de radar y mostrarlas en web

```bash
export SONDEOS_DIR=/ruta/a/sondeos
python descarga_sondeos.py            # escribe ahí
cd web && npm run build && npm start  # sirve desde ahí
```

En la web, `SONDEOS_DIR` puede ser absoluta o relativa al proceso de Node (que
corre en `web/`), por ejemplo `SONDEOS_DIR=../sondeos`.

## Municipios

```bash
python descarga_municipios.py    # -> web/public/geo/municipios_peninsula.geojson
```

Para el mapeo de lluvia, `MapaRadar` acepta `lluvia`: un objeto **CVEGEO → mm·h⁻¹**
con la clave de 5 dígitos del INEGI. Los municipios con dato se rellenan con la
escala del SMN (`web/src/lib/municipios.js`), los demás quedan sólo con su
trazo para no tapar los ecos. `onMunicipio` recibe las propiedades del municipio
al hacer clic.
