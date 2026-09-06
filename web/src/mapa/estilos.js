/**
 * Estilos de las capas vectoriales.
 *
 * Los rótulos se pintan en el mismo lienzo que la geometría, así que sus
 * colores y cuerpos de letra viven aquí y no en `consola.css`: son los valores
 * del diseño (las variables del tema, resueltas). El halo es un trazo del color
 * del fondo alrededor de la letra —el equivalente del `text-shadow` de una
 * etiqueta HTML—, y es lo único que mantiene legible un rótulo claro cuando le
 * pasa un eco por debajo.
 */
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Text from "ol/style/Text";

export const FONDO = "#070A0C"; // el del escenario, para el halo de los rótulos
export const MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';
export const SANS = '"IBM Plex Sans", system-ui, sans-serif';

export const TEAL = "#2DD4BF";
export const ACENTO = "#4C8DF6";

const HALO = (ancho) => new Stroke({ color: FONDO, width: ancho });

/**
 * Rótulo de mapa. Por omisión va a la derecha del punto, como los `divIcon`
 * que sustituye.
 */
export function rotulo({
  texto,
  color,
  tam = 10,
  fuente = MONO,
  peso = 400,
  dx = 7,
  dy = 0,
  align = "left",
  baseline = "middle",
  halo = 3,
}) {
  return new Text({
    text: texto,
    font: `${peso} ${tam}px ${fuente}`,
    textAlign: align,
    textBaseline: baseline,
    offsetX: dx,
    offsetY: dy,
    fill: new Fill({ color }),
    stroke: HALO(halo),
    /* El decluttering se decide por capa; los rótulos que sí lo usan se apoyan
       en este margen para no quedar pegados unos a otros. */
    padding: [2, 3, 2, 3],
  });
}
