/**
 * Línea de costa y frontera del INEGI (generalización 1:1 000 000).
 */
import { memo, useMemo } from "react";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import { useCapa } from "../mapa/contexto";
import { DATOS, NIVEL, VISTA } from "../mapa/geo";
import { RUTAS, useGeo } from "../lib/inegi";

const COSTA = new Style({ stroke: new Stroke({ color: "rgba(126,158,186,.5)", width: 0.9 }) });
const FRONTERA = new Style({
  stroke: new Stroke({ color: "rgba(150,150,175,.42)", width: 0.9, lineDash: [5, 4] }),
});

function CapaCosta() {
  const geo = useGeo(RUTAS.costa);
  const formato = useMemo(() => new GeoJSON({ dataProjection: DATOS, featureProjection: VISTA }), []);

  useCapa(() => {
    if (!geo) return null;
    return new VectorLayer({
      zIndex: NIVEL.costa,
      source: new VectorSource({
        features: formato.readFeatures(geo),
      }),
      style: (f) => (f.get("tipo") === "Frontera" ? FRONTERA : COSTA),
    });
  }, [geo, formato]);

  return null;
}

export default memo(CapaCosta);
