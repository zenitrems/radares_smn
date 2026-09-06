/**
 * Aeropuertos del INEGI dentro del escenario.
 *
 * Son trece y no cambian: se rotula el nombre corto (el campo `nombre` del
 * INEGI viene 'N/D' en casi todos, así que el script guarda el nombre completo
 * y aquí se recorta el prefijo protocolario).
 */
import { memo } from "react";
import { Marker } from "react-leaflet";
import L from "leaflet";
import { RUTAS, useGeo } from "../lib/inegi";

const corto = (nombre) =>
  nombre
    .replace(/^Aeropuerto (Internacional|Nacional)( de)?\s*/i, "")
    .replace(/,.*$/, "")
    .trim();

function CapaAeropuertos() {
  const geo = useGeo(RUTAS.aeropuertos);
  if (!geo) return null;

  return (
    <>
      {geo.features.map((f) => {
        const [lon, lat] = f.geometry.coordinates;
        return (
          <Marker
            key={f.id}
            position={[lat, lon]}
            interactive={false}
            keyboard={false}
            icon={L.divIcon({
              className: "mk-aero",
              html: `<i></i><b>${corto(f.properties.oaci)}</b>`,
              iconSize: [0, 0],
              iconAnchor: [0, 0],
            })}
          />
        );
      })}
    </>
  );
}

export default memo(CapaAeropuertos);
