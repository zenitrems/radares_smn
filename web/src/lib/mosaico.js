/**
 * Combinación de estaciones en una sola línea de tiempo.
 *
 * Sabancuy y Cancún no sondean a la vez ni a la misma cadencia (~10 y ~8 min),
 * así que no hay instantes comunes: se construye un eje con los instantes de
 * ambas y en cada paso cada estación muestra su sondeo más cercano, siempre que
 * caiga dentro de la tolerancia. Fuera de ella la estación no pinta nada, en
 * lugar de arrastrar un eco viejo sobre el mapa.
 */
export const PRODUCTO_MOSAICO = 450;
export const TOLERANCIA_MIN = 12;

/** Instantes más próximos entre sí que esto se consideran el mismo paso. */
const FUSION_MIN = 3;

const ms = (iso) => new Date(iso).getTime();

/** Índice del sondeo más cercano a `t`, o -1 si ninguno entra en la tolerancia. */
export function masCercano(frames, t, toleranciaMs) {
  let mejor = -1;
  let dist = Infinity;
  frames.forEach((f, i) => {
    const d = Math.abs(ms(f.t) - t);
    if (d < dist) {
      dist = d;
      mejor = i;
    }
  });
  return dist <= toleranciaMs ? mejor : -1;
}

/**
 * `estaciones`: [{ id, frames }]. Devuelve los pasos del eje, cada uno con el
 * índice del sondeo que le toca a cada estación (-1 si no tiene).
 */
export function construirPasos(estaciones, toleranciaMin = TOLERANCIA_MIN) {
  const instantes = estaciones
    .flatMap((e) => e.frames.map((f) => ms(f.t)))
    .sort((a, b) => a - b);

  const ejes = [];
  for (const t of instantes) {
    if (ejes.length && t - ejes[ejes.length - 1] <= FUSION_MIN * 60000) continue;
    ejes.push(t);
  }

  const tol = toleranciaMin * 60000;
  return ejes.map((t) => ({
    t: new Date(t).toISOString(),
    idx: estaciones.map((e) => masCercano(e.frames, t, tol)),
  }));
}

/** Recorta los pasos a las últimas `horas` contadas desde el paso más reciente. */
export function ventanaDePasos(pasos, horas) {
  if (!horas || pasos.length === 0) return pasos;
  const corte = ms(pasos[pasos.length - 1].t) - horas * 3600e3;
  const recorte = pasos.filter((p) => ms(p.t) >= corte);
  return recorte.length > 0 ? recorte : pasos.slice(-1);
}

/** Productos de `rango` km con sondeos en disco, uno por radar. */
export function estacionesDelMosaico(catalogo, rango = PRODUCTO_MOSAICO) {
  return catalogo.radars
    .map((radar) => {
      const producto = radar.products.find((p) => p.range === rango && p.frames.length > 0);
      return producto ? { id: radar.estacion, radar, producto, frames: producto.frames } : null;
    })
    .filter(Boolean);
}
