/**
 * Lectura del catálogo de sondeos desde disco (solo servidor).
 *
 * `descarga_sondeos.py` guarda en <SONDEOS_DIR>/<ESTACIÓN>/<TIPO>/ y deriva
 * <TIPO> del nombre del archivo, así que aquí se aplica la misma regla sobre el
 * `filter` de radares.json para encontrar el directorio de cada producto.
 *
 * El directorio se recorre en cada petición y las imágenes se entregan por
 * /api/sondeo, nunca desde public/: ver src/lib/almacen.js.
 */
import fs from "fs";
import path from "path";
import radares from "../../radares.json";
import { DIR_SONDEOS, urlDeSondeo } from "./almacen";

const BASE = DIR_SONDEOS;
const RE_SONDEO = /_(\d{8})_(\d{6})\.gif$/;

export const estacionDe = (filter) => filter.split("_")[0];

/** 'CANC_PPIX_REFL_300' -> 'PPIX_REFL_300'; 'CANC_CMAX_REFL_300' -> 'CMAX_REFL' */
export function tipoDe(filter) {
  const p = filter.split("_");
  return p[1] === "PPIX" ? p.slice(1, 4).join("_") : p.slice(1, 3).join("_");
}

function directorios(estacion) {
  try {
    return fs
      .readdirSync(path.join(BASE, estacion), { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    return [];
  }
}

/**
 * El `filter` de radares.json no siempre trae el sufijo del directorio
 * (CANC_PPIX_VELO vs PPIX_VELO_120), por eso se acepta coincidencia por prefijo.
 */
function directorioDe(estacion, tipo) {
  const dirs = directorios(estacion);
  return dirs.find((d) => d === tipo) || dirs.find((d) => d.startsWith(`${tipo}_`)) || null;
}

/** Los nombres de archivo del SMN vienen en UTC. */
export function fechaDe(nombre) {
  const m = nombre.match(RE_SONDEO);
  if (!m) return null;
  const [, f, h] = m;
  const t = Date.UTC(
    +f.slice(0, 4),
    +f.slice(4, 6) - 1,
    +f.slice(6, 8),
    +h.slice(0, 2),
    +h.slice(2, 4),
    +h.slice(4, 6)
  );
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

function framesDe(estacion, dir) {
  const ruta = path.join(BASE, estacion, dir);
  let archivos;
  try {
    archivos = fs.readdirSync(ruta);
  } catch {
    return [];
  }
  return archivos
    .filter((f) => f.endsWith(".gif"))
    .map((f) => ({ file: f, t: fechaDe(f), src: urlDeSondeo(estacion, dir, f) }))
    .filter((f) => f.t)
    .sort((a, b) => a.t.localeCompare(b.t));
}

export function leerCatalogo() {
  const radars = radares
    .filter((r) => r.show !== false)
    .map((r) => {
      const productos = r.products
        .filter((p) => p.show !== false)
        .map((p) => {
          const estacion = estacionDe(p.filter);
          const dir = directorioDe(estacion, tipoDe(p.filter));
          return {
            type: p.type,
            moment: p.moment,
            urlName: p.urlName,
            filter: p.filter,
            range: p.range,
            elevation: p.elevation ?? null,
            thresholds: p.thresholds ?? null,
            map: { bounds: p.map.bounds, center: p.map.center, zoom: p.map.zoom ?? null },
            estacion,
            dir,
            frames: dir ? framesDe(estacion, dir) : [],
          };
        });

      return {
        urlName: r.urlName,
        showName: r.showName,
        source: r.source,
        radarBrand: r.radarBrand,
        markerCenter: r.markerCenter,
        maintenance: !!r.maintenance,
        estacion: productos[0]?.estacion ?? r.urlName.slice(0, 4).toUpperCase(),
        products: productos,
      };
    })
    .filter((r) => r.products.length > 0);

  return { generadoEn: new Date().toISOString(), radars };
}
