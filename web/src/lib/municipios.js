/**
 * División municipal de la península y escala de lluvia por municipio.
 *
 * Los polígonos salen del Marco Geoestadístico del INEGI (WFS, no WMS: hacen
 * falta vectores para colorear municipio por municipio) y los baja
 * `descarga_municipios.py` a web/public/geo/. Son 130 municipios de Campeche,
 * Quintana Roo y Yucatán, identificados por CVEGEO — la clave de 5 dígitos
 * (entidad + municipio) con la que se cruza cualquier tabla del INEGI o de
 * CONAGUA.
 */

export const RUTA_MUNICIPIOS = "/geo/municipios_peninsula.geojson";

/**
 * Tramos de intensidad de lluvia en mm·h⁻¹, los mismos cortes que usa el visor
 * del SMN. `hasta` es el límite superior del tramo: gana el primero que lo
 * supera.
 */
export const LLUVIA = [
  { hasta: 6.1, lb: "ligera", color: "#8fe08a" },
  { hasta: 13.72, lb: "moderada", color: "#f5d800" },
  { hasta: 30.48, lb: "fuerte", color: "#f58a2e" },
  { hasta: 50.3, lb: "violenta", color: "#f0506e" },
  { hasta: 74.68, lb: "severa", color: "#e040e0" },
  { hasta: Infinity, lb: "extrema", color: "#8a4fe0" },
];

/* Por debajo del primer corte del SMN hay traza, no lluvia: no se colorea. */
export const MIN_LLUVIA = 3.06;

export function tramoDeLluvia(mm) {
  if (mm == null || !Number.isFinite(mm) || mm < MIN_LLUVIA) return null;
  return LLUVIA.find((t) => mm <= t.hasta);
}

/* Un único fetch por sesión: son 2.7 MB y la capa se monta y desmonta con su
   casilla, además de una vez por consola (sencilla y mosaico). */
let promesa = null;

export function cargaMunicipios() {
  if (!promesa) {
    promesa = fetch(RUTA_MUNICIPIOS)
      .then((r) => {
        if (!r.ok) throw new Error(`GeoJSON municipal: HTTP ${r.status}`);
        return r.json();
      })
      .catch((e) => {
        promesa = null; // que un fallo de red no deje la capa muerta para siempre
        throw e;
      });
  }
  return promesa;
}
