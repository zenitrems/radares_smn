/**
 * Línea de costa y frontera del INEGI (generalización 1:1 000 000).
 *
 * Sin mapa base de teselas, los municipios sólo dibujan la península: fuera de
 * Campeche, Quintana Roo y Yucatán el escenario quedaba vacío, y los productos
 * de 450 km encuadran buena parte del golfo, Tabasco y Belice. Esta capa
 * devuelve ese contexto sin traer nada más.
 */
import { memo } from "react";
import { GeoJSON } from "react-leaflet";
import { RUTAS, useGeo } from "../lib/inegi";

const COSTA = { color: "rgba(126,158,186,.5)", weight: 0.9, interactive: false, fill: false };
const FRONTERA = { ...COSTA, color: "rgba(150,150,175,.42)", dashArray: "5 4" };

function CapaCosta() {
  const geo = useGeo(RUTAS.costa);
  if (!geo) return null;
  return (
    <GeoJSON
      data={geo}
      style={(f) => (f.properties.tipo === "Frontera" ? FRONTERA : COSTA)}
      attribution='línea de costa: <a href="https://www.inegi.org.mx/">INEGI</a>'
    />
  );
}

export default memo(CapaCosta);
