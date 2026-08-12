Descargar imagenes de radar y mostrarlas en web

## Dónde viven los sondeos

`descarga_sondeos.py` escribe en `<SONDEOS_DIR>/<ESTACIÓN>/<TIPO>/` y la web lee
ese mismo directorio en cada petición. Ya no hace falta el symlink dentro de
`web/public`: Next fija el contenido de `public/` al construir, así que los
sondeos que llegan después del build no se sirven. Las imágenes salen por
`/api/sondeo/<ESTACIÓN>/<TIPO>/<ARCHIVO>`, que las lee del disco al momento.

Una sola variable configura las dos partes (si no se define, se conserva la
ubicación histórica `web/public/sondeos`):

```bash
export SONDEOS_DIR=/ruta/a/sondeos
python descarga_sondeos.py            # escribe ahí
cd web && npm run build && npm start  # sirve desde ahí
```

En la web, `SONDEOS_DIR` puede ser absoluta o relativa al proceso de Node (que
corre en `web/`), por ejemplo `SONDEOS_DIR=../sondeos`.
