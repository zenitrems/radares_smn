/**
 * Puente entre las coordenadas del proyecto y las de OpenLayers.
 *
 * El catálogo de radares y los GeoJSON del INEGI hablan en grados; OpenLayers
 * dibuja en Mercator esférico. Todo lo que cruza esa frontera pasa por aquí,
 * incluidos los `bounds` del SMN, que vienen por esquinas y en el orden
 * [[norte,oeste],[sur,este]], no como el extent [minx,miny,maxx,maxy] de OL.
 */
import { fromLonLat, toLonLat, transformExtent } from "ol/proj";

export const DATOS = "EPSG:4326"; // catálogo del SMN y capas del INEGI
export const VISTA = "EPSG:3857"; // proyección del mapa

/** [lat, lon] → coordenada de la vista. */
export const aVista = ([lat, lon]) => fromLonLat([lon, lat], VISTA);

/** Coordenada de la vista → [lat, lon]. */
export const aGrados = (coord) => {
  const [lon, lat] = toLonLat(coord, VISTA);
  return [lat, lon];
};

/** `bounds` del catálogo ([[n,w],[s,e]]) → extent OL [minx, miny, maxx, maxy]. */
export function extentDe(bounds) {
  const [[n, w], [s, e]] = bounds;
  return transformExtent(
    [Math.min(w, e), Math.min(n, s), Math.max(w, e), Math.max(n, s)],
    DATOS,
    VISTA
  );
}

/**
 * Orden de apilado. OpenLayers ordena por `zIndex` antes que por el orden de
 * alta, y aquí hace falta: las capas se montan y desmontan con las casillas del
 * panel, así que una capa reencendida volvería arriba del todo si el orden
 * dependiera de cuándo se añadió.
 */
export const NIVEL = {
  base: 0,
  ecos: 10,
  costa: 20,
  municipios: 30,
  reticula: 40,
  anillos: 50,
  localidades: 60,
  aeropuertos: 70,
  sitios: 80,
};
