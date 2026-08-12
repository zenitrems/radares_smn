import { leerCatalogo } from "../../lib/catalogo";

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json(leerCatalogo());
}
