/**
 * Acceso de lectura a las observaciones de estaciones automáticas.
 */
import { Pool } from "pg";

// Next recarga este módulo en cada cambio en desarrollo; el pool se guarda en
// globalThis para no abrir una conexión nueva por recarga.
function crearPool() {
  return new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || "estaciones_smn",
    user: process.env.WEB_DB_USER,
    password: process.env.WEB_DB_PASSWORD,
    ssl: /^(require|verify-full)$/.test(process.env.DB_SSLMODE || "") ? { rejectUnauthorized: false } : false,
    max: 5,
    connectionTimeoutMillis: 5000,
  });
}

export function query(texto, params) {
  if (!globalThis.__pgPool) globalThis.__pgPool = crearPool();
  return globalThis.__pgPool.query(texto, params);
}
