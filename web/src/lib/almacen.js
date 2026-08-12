/**
 * Dónde viven los sondeos en disco y cómo se resuelve su ruta (solo servidor).
 *
 * No se sirven desde `public/`: Next fija el contenido de esa carpeta al
 * construir, así que los sondeos que `descarga_sondeos.py` deja después del
 * build no llegarían al navegador. El directorio se lee en cada petición y las
 * imágenes salen por /api/sondeo/<ESTACIÓN>/<TIPO>/<ARCHIVO>.
 *
 * `SONDEOS_DIR` permite apuntar a cualquier ruta (absoluta o relativa al
 * proceso); si no se define se mantiene la ubicación histórica, de modo que
 * nada se rompe mientras se mueve la descarga fuera del repositorio.
 */
import fs from "fs";
import path from "path";

export const DIR_SONDEOS = path.resolve(
  process.env.SONDEOS_DIR || path.join(process.cwd(), "public", "sondeos")
);

/* Nombres tal como los genera el SMN: sin puntos, barras ni acentos. */
const SEGMENTO = /^[A-Za-z0-9_-]+$/;
const ARCHIVO = /^[A-Za-z0-9_-]+\.(gif|png)$/i;

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Ruta absoluta del sondeo, o null si el nombre no es válido o se saldría del
 * directorio base (defensa doble: patrón estricto y comprobación de la raíz).
 */
export function rutaDeSondeo(estacion, tipo, archivo) {
  if (typeof estacion !== "string" || typeof tipo !== "string" || typeof archivo !== "string") {
    return null;
  }
  if (!SEGMENTO.test(estacion) || !SEGMENTO.test(tipo) || !ARCHIVO.test(archivo)) return null;
  const ruta = path.resolve(DIR_SONDEOS, estacion, tipo, archivo);
  return ruta.startsWith(DIR_SONDEOS + path.sep) ? ruta : null;
}

export const urlDeSondeo = (estacion, tipo, archivo) =>
  `/api/sondeo/${estacion}/${tipo}/${archivo}`;

/**
 * Tipo real según los primeros bytes: los sondeos de Sabancuy son PNG aunque el
 * SMN los publique con extensión .gif.
 */
export function mimeDe(ruta) {
  const buf = Buffer.alloc(8);
  let fd;
  try {
    fd = fs.openSync(ruta, "r");
    fs.readSync(fd, buf, 0, 8, 0);
  } catch {
    return "application/octet-stream";
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
  if (buf.equals(PNG)) return "image/png";
  if (buf.subarray(0, 3).toString("latin1") === "GIF") return "image/gif";
  return "application/octet-stream";
}
