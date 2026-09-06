/**
 * Localidades del INEGI, rotuladas según el zoom.
 *
 * Sustituye la lista de catorce ciudades escrita a mano: son 1602 localidades
 * amanzanadas de la península, y el criterio para decidir cuáles se ven es el
 * área de su mancha urbana (`area_km2`, que calcula `descarga_inegi.py`). No es
 * población —el WFS del INEGI no publica ninguna— pero ordena igual de bien:
 * Mérida 250 km², Cancún 152, Playa del Carmen 57.
 *
 * Se filtra además por el encuadre visible y se topa el número de rótulos: con
 * los mil y pico marcadores montados a la vez, Leaflet reconstruye demasiado
 * DOM en cada avance del reproductor.
 */
import { memo, useCallback, useMemo, useState } from "react";
import { Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { RUTAS, useGeo } from "../lib/inegi";

/* Área mínima (km²) para que una localidad se rotule a cada zoom. Los cortes
   salen de mirar la península: en 7 sólo quedan las cuatro capitales, y a
   partir de 11 aparecen las cabeceras municipales pequeñas. */
const UMBRALES = [
  [7, 30],
  [8, 12],
  [9, 5],
  [10, 2],
  [11, 0.8],
  [12, 0.3],
  [Infinity, 0],
];

const MAX_ROTULOS = 90;
const AREA_PRINCIPAL = 20; // por encima de esto el rótulo va destacado

const areaMinima = (zoom) => UMBRALES.find(([z]) => zoom <= z)[1];

function CapaLocalidades() {
  const geo = useGeo(RUTAS.localidades);
  const map = useMap();
  const [vista, setVista] = useState(() => ({ zoom: map.getZoom(), limites: map.getBounds() }));

  const actualiza = useCallback(
    () => setVista({ zoom: map.getZoom(), limites: map.getBounds() }),
    [map]
  );
  useMapEvents({ zoomend: actualiza, moveend: actualiza });

  /* De mayor a menor una sola vez: así el recorte por zoom es un filtro y el
     tope se queda con las localidades más grandes, no con las primeras. */
  const porTamaño = useMemo(() => {
    if (!geo) return [];
    return geo.features
      .map((f) => ({
        id: f.id,
        nombre: f.properties.NOMGEO,
        area: f.properties.area_km2,
        pos: [f.geometry.coordinates[1], f.geometry.coordinates[0]],
      }))
      .sort((a, b) => b.area - a.area);
  }, [geo]);

  const visibles = useMemo(() => {
    const min = areaMinima(vista.zoom);
    const salida = [];
    for (const l of porTamaño) {
      if (l.area < min) break; // viene ordenado: a partir de aquí ninguna pasa
      if (vista.limites.contains(l.pos)) salida.push(l);
      if (salida.length >= MAX_ROTULOS) break;
    }
    return salida;
  }, [porTamaño, vista]);

  return (
    <>
      {visibles.map((l) => (
        <Marker
          key={l.id}
          position={l.pos}
          interactive={false}
          keyboard={false}
          icon={L.divIcon({
            className: `mk-ciudad${l.area >= AREA_PRINCIPAL ? " pri" : ""}`,
            html: `<i></i><b>${l.nombre}</b>`,
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          })}
        />
      ))}
    </>
  );
}

export default memo(CapaLocalidades);
