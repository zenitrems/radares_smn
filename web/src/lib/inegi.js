/**
 * Acceso a las capas del INEGI que sirven de referencia geográfica.
 *
 * Los archivos los genera `descarga_inegi.py` desde el WFS del INEGI y Next los
 * sirve como assets estáticos. Se cargan bajo demanda —sólo cuando su casilla
 * está encendida— y una única vez por sesión: entre municipios y localidades
 * son más de 3 MB, y la consola monta el mapa dos veces (consola y mosaico).
 */
import { useEffect, useState } from "react";

export const RUTAS = {
  municipios: "/geo/municipios_peninsula.geojson",
  localidades: "/geo/localidades_peninsula.geojson",
  costa: "/geo/costa_peninsula.geojson",
  aeropuertos: "/geo/aeropuertos_peninsula.geojson",
};

const cache = new Map();

export function cargaGeo(ruta) {
  if (!cache.has(ruta)) {
    cache.set(
      ruta,
      fetch(ruta)
        .then((r) => {
          if (!r.ok) throw new Error(`${ruta}: HTTP ${r.status}`);
          return r.json();
        })
        .catch((e) => {
          cache.delete(ruta); // que un fallo de red no deje la capa muerta para siempre
          throw e;
        })
    );
  }
  return cache.get(ruta);
}

/** Carga una capa y la deja en estado; devuelve null mientras no esté lista. */
export function useGeo(ruta) {
  const [geo, setGeo] = useState(null);
  useEffect(() => {
    let vivo = true;
    cargaGeo(ruta)
      .then((fc) => vivo && setGeo(fc))
      .catch(() => {
        /* la consola sigue siendo útil sin esta capa */
      });
    return () => {
      vivo = false;
    };
  }, [ruta]);
  return geo;
}
