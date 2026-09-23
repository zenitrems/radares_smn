import { useEffect, useState } from "react";
// refrescar más seguido no traería nada nuevo.
const REFRESCO_MS = 3 * 60 * 1000;

/** Últimas observaciones de las estaciones automáticas, leídas de /api/estaciones. */
export function useEstaciones() {
  const [estaciones, setEstaciones] = useState([]);

  useEffect(() => {
    let vivo = true;
    const cargar = async () => {
      try {
        const r = await fetch("/api/estaciones");
        if (!r.ok) return;
        const { estaciones: filas } = await r.json();
        if (vivo) setEstaciones(filas);
      } catch {
        /* la capa sigue con la última lectura que tenga */
      }
    };
    cargar();
    const id = setInterval(cargar, REFRESCO_MS);
    return () => {
      vivo = false;
      clearInterval(id);
    };
  }, []);

  return estaciones;
}
