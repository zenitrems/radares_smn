/**
 * Entrega un sondeo desde disco. El nombre del archivo lleva la marca de tiempo
 * de la captura, así que el contenido nunca cambia: se cachea como inmutable y
 * la animación puede precargar los fotogramas sin volver a pedirlos.
 */
import fs from "fs";
import { mimeDe, rutaDeSondeo } from "../../../lib/almacen";

export const config = { api: { responseLimit: "16mb" } };

export default function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "método no permitido" });
  }

  const partes = [].concat(req.query.ruta ?? []);
  if (partes.length !== 3) {
    return res.status(400).json({ error: "se espera /api/sondeo/<ESTACIÓN>/<TIPO>/<ARCHIVO>" });
  }

  const ruta = rutaDeSondeo(...partes);
  if (!ruta) return res.status(400).json({ error: "nombre de sondeo inválido" });

  let info;
  try {
    info = fs.statSync(ruta);
    if (!info.isFile()) throw new Error("no es un archivo");
  } catch {
    return res.status(404).json({ error: "sondeo no encontrado" });
  }

  const etag = `"${info.size.toString(16)}-${Math.trunc(info.mtimeMs).toString(16)}"`;
  res.setHeader("ETag", etag);
  res.setHeader("Last-Modified", info.mtime.toUTCString());
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.setHeader("Content-Type", mimeDe(ruta));

  if (req.headers["if-none-match"] === etag) return res.status(304).end();

  res.setHeader("Content-Length", info.size);
  if (req.method === "HEAD") return res.status(200).end();

  const flujo = fs.createReadStream(ruta);
  flujo.on("error", () => {
    /* el sondeo pudo rotar entre el stat y la lectura */
    if (!res.headersSent) res.status(404).json({ error: "sondeo no disponible" });
    else res.destroy();
  });
  flujo.pipe(res);
}
