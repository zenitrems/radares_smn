/**
 * Escala de lluvia por municipio.
 *
 * Los municipios se identifican por CVEGEO, la clave de 5 dígitos del INEGI
 * (entidad + municipio) con la que se cruza cualquier tabla del propio INEGI o
 * de CONAGUA. La geometría la carga lib/inegi.
 */

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
