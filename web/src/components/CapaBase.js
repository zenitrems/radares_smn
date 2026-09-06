/**
 * Mapa base seleccionado, o ninguno.
 *
 * Leaflet coloca las teselas en su propio panel (`tilePane`, por debajo de
 * `overlayPane`), así que el orden en el JSX no importa: el mapa base siempre
 * queda bajo los ecos y los vectores.
 */
import { TileLayer } from "react-leaflet";
import { disponible, mapaPorId } from "../lib/mapas";

export default function CapaBase({ id }) {
  const mapa = mapaPorId(id);
  if (!mapa.url || !disponible(mapa)) return null;

  return (
    <TileLayer
      key={mapa.id}
      url={mapa.url}
      attribution={mapa.attribution}
      tileSize={mapa.tileSize}
      zoomOffset={mapa.zoomOffset}
      maxZoom={mapa.maxZoom}
      opacity={mapa.opacity ?? 1}
    />
  );
}
