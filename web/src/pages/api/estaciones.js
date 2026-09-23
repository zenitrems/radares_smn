/**
 * Última observación de cada estación automática activa, para CapaEstaciones.
 */
import { query } from "../../lib/db";

const SQL = `
  SELECT e.estacion_m, e.nombre_estacion, e.municipio, e.estado, e.lon, e.lat,
         o.fecha_utc, o.temperatura, o.humedad, o.presion,
         o.precipitacion, o.radiacion, o.viento_dir, o.viento_vel,
         o.racha_dir, o.racha_vel
  FROM ultima_observacion o
  JOIN estaciones e USING (estacion_m)
  ORDER BY e.estacion_m
`;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const { rows } = await query(SQL);
    res.status(200).json({ generadoEn: new Date().toISOString(), estaciones: rows });
  } catch (e) {
    console.error("api/estaciones:", e.message);
    res.status(503).json({ error: "no se pudo leer PostgreSQL" });
  }
}
