/**
 * Capa de aeropuertos, con el código OACI por rótulo.
 */
import { memo, useMemo } from "react";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import Fill from "ol/style/Fill";
import RegularShape from "ol/style/RegularShape";
import Style from "ol/style/Style";
import { useCapa } from "../mapa/contexto";
import { DATOS, NIVEL, VISTA } from "../mapa/geo";
import { ACENTO, MONO, rotulo } from "../mapa/estilos";

import { RUTAS, useGeo } from "../lib/inegi";

const corto = (nombre) =>
  nombre
    .replace(/^Aeropuerto (Internacional|Nacional)( de)?\s*/i, "")
    .replace(/,.*$/, "")
    .trim();

/* Triángulo, como el `border-bottom` que dibujaba el marcador en CSS. */
const MARCA = new RegularShape({
  points: 3,
  radius: 5,
  fill: new Fill({ color: ACENTO }),
  displacement: [0, 1],
});

const cache = new Map();
function estiloDe(texto) {
  if (!cache.has(texto)) {
    cache.set(
      texto,
      new Style({
        image: MARCA,
        text: rotulo({ texto, fuente: MONO, color: ACENTO, tam: 9.5, dx: 9 }),
      })
    );
  }
  return cache.get(texto);
}

function CapaAeropuertos() {
  const geo = useGeo(RUTAS.aeropuertos);
  const formato = useMemo(() => new GeoJSON({ dataProjection: DATOS, featureProjection: VISTA }), []);

  useCapa(() => {
    if (!geo) return null;
    return new VectorLayer({
      zIndex: NIVEL.aeropuertos,
      declutter: true,
      source: new VectorSource({
        features: formato.readFeatures(geo),
        attributions: 'aeropuertos: <a href="https://www.inegi.org.mx/">INEGI</a>',
      }),
      style: (f) => estiloDe(corto(f.get("oaci"))),
    });
  }, [geo, formato]);

  return null;
}

export default memo(CapaAeropuertos);
