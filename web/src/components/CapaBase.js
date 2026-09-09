/**
 * Mapa base seleccionado, o ninguno.
 *
 * Va en el nivel más bajo del apilado: las teselas son el fondo del escenario y
 * nunca deben pasar por encima de un eco.
 */
import TileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";
import { useCapa } from "../mapa/contexto";
import { NIVEL } from "../mapa/geo";
import { disponible, mapaPorId } from "../lib/mapas";

export default function CapaBase({ id }) {
  const mapa = mapaPorId(id);
  const usable = Boolean(mapa.url) && disponible(mapa);

  useCapa(() => {
    if (!usable) return null;
    return new TileLayer({
      zIndex: NIVEL.base,
      opacity: mapa.opacity ?? 1,
      source: new XYZ({
        url: mapa.url,
        attributions: "WCONAGUA/SMN INEGI " + mapa.attribution,
        /* `tileSize` es el mapa que cubre cada tesela y `tilePixelRatio` los
           píxeles de imagen que trae: así se describe una de 512 servida a @2x
           sin tener que desplazar el zoom. */
        tileSize: mapa.tileSize ?? 256,
        tilePixelRatio: mapa.tilePixelRatio ?? 1,
        maxZoom: mapa.maxZoom ?? 19,
      }),
    });
  }, [usable, mapa.id]);

  return null;
}
