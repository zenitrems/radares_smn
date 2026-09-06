/**
 * El poco pegamento que hace falta entre React y OpenLayers.
 *
 * OpenLayers no trae binding de React y tampoco hace falta más que esto: el
 * mapa se publica por contexto y cada capa es un componente que no pinta nada
 * —se limita a dar de alta su capa OL mientras esté montado—. Así el árbol de
 * `MapaRadar` se lee como la lista de lo que hay en el escenario en vez de
 * como una secuencia de `addLayer`.
 */
import { createContext, useContext, useEffect, useMemo } from "react";

const Ctx = createContext(null);

export const ProveedorMapa = Ctx.Provider;

/** El `ol/Map` del escenario. Sólo válido dentro de `MapaRadar`. */
export const useMapa = () => useContext(Ctx);

/**
 * Crea una capa OL con `crear` y la mantiene en el mapa mientras el componente
 * viva. Si `crear` devuelve null (típicamente porque el GeoJSON aún no ha
 * llegado) no se añade nada y se vuelve a intentar cuando cambien las `deps`.
 */
export function useCapa(crear, deps) {
  const mapa = useMapa();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const capa = useMemo(crear, deps);

  useEffect(() => {
    if (!mapa || !capa) return undefined;
    mapa.addLayer(capa);
    return () => {
      mapa.removeLayer(capa);
      capa.dispose();
    };
  }, [mapa, capa]);

  return capa;
}
