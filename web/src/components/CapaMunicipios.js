/**
 * Capa de división municipal sobre el escenario del radar.
 *
 * Sirve para tres cosas: sustituir al mapa base de teselas (la consola puede no
 * cargar ninguno), dar referencia territorial a los ecos (dónde está cayendo, no
 * sólo a cuántos km del sitio) y ser el soporte del mapeo de lluvia por
 * municipio — `lluvia` es un objeto CVEGEO → mm·h⁻¹ y los municipios con dato
 * se rellenan con la escala del SMN.
 *
 * El GeoJSON se carga una vez por sesión (lib/inegi) y se monta sólo cuando la
 * casilla está encendida, porque son 6.6 MB y ~145 mil vértices.
 */
import { memo, useEffect, useMemo, useRef } from "react";
import Overlay from "ol/Overlay";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import { useCapa, useMapa } from "../mapa/contexto";
import { DATOS, NIVEL, VISTA } from "../mapa/geo";
import { RUTAS, useGeo } from "../lib/inegi";
import { tramoDeLluvia } from "../lib/municipios";

const TRAZO = "rgba(138,172,202,.62)";
const TRAZO_ACTIVO = "#2DD4BF";

/* Sin dato el municipio va sin relleno visible: los ecos de radar quedan debajo
   y taparlos con una lámina de color sería contraproducente. Pero el relleno
   tiene que existir para que el ratón encuentre el municipio por dentro y no
   sólo justo encima del trazo: OpenLayers resuelve el impacto leyendo el alfa
   del píxel dibujado, así que el mínimo imperceptible en vez de nada. */
const SIN_DATO = "rgba(11,14,17,.012)";

const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/* Un `Style` por color de relleno: la función de estilo se llama una vez por
   municipio y por repintado, y no hay por qué construirlos cada vez. */
const cache = new Map();
function estiloDe(relleno, activo) {
  const clave = `${relleno}|${activo}`;
  if (!cache.has(clave)) {
    cache.set(
      clave,
      new Style({
        fill: new Fill({ color: relleno }),
        stroke: new Stroke({
          color: activo ? TRAZO_ACTIVO : TRAZO,
          width: activo ? 1.6 : 0.85,
        }),
        /* El municipio señalado por encima de sus vecinos: si no, el trazo del
           de al lado repasa por encima del borde resaltado. */
        zIndex: activo ? 1 : 0,
      })
    );
  }
  return cache.get(clave);
}

const rotulo = (props, mm) => {
  const tramo = tramoDeLluvia(mm);
  const lluviaTxt = tramo
    ? `<i>${mm.toFixed(1)} mm·h⁻¹ · ${tramo.lb}</i>`
    : '<i class="sin">sin dato de lluvia</i>';
  return `<b>${props.NOMGEO}</b><span>${props.NOM_ENT} · ${props.CVEGEO}</span>${lluviaTxt}`;
};

function CapaMunicipios({ lluvia, onMunicipio }) {
  const mapa = useMapa();
  const geo = useGeo(RUTAS.municipios);
  const formato = useMemo(() => new GeoJSON({ dataProjection: DATOS, featureProjection: VISTA }), []);

  /* `lluvia`, el municipio señalado y el manejador de clic en refs: los
     escuchadores del mapa se registran una sola vez y de otro modo se quedarían
     con los valores del primer render. */
  const lluviaRef = useRef(lluvia);
  lluviaRef.current = lluvia;
  const señalado = useRef(null);
  const alClic = useRef(onMunicipio);
  alClic.current = onMunicipio;

  const capa = useCapa(() => {
    if (!geo) return null;
    return new VectorLayer({
      zIndex: NIVEL.municipios,
      source: new VectorSource({
        features: formato.readFeatures(geo),
      }),
      style: (f) => {
        const tramo = tramoDeLluvia(lluviaRef.current[f.get("CVEGEO")]);
        return estiloDe(
          tramo ? rgba(tramo.color, 0.45) : SIN_DATO,
          f === señalado.current
        );
      },
    });
  }, [geo, formato]);

  /* Recolorea al llegar datos nuevos sin volver a leer los 271 polígonos. */
  useEffect(() => {
    if (capa) capa.changed();
  }, [capa, lluvia]);

  /* Rótulo flotante: un `Overlay` que sigue al puntero. */
  useEffect(() => {
    if (!mapa || !capa) return undefined;

    const caja = document.createElement("div");
    caja.className = "tt-municipio";
    const globo = new Overlay({
      element: caja,
      offset: [0, -14],
      positioning: "bottom-center",
      className: "tt-capa",
    });
    mapa.addOverlay(globo);

    const apagar = () => {
      globo.setPosition(undefined);
      if (señalado.current) {
        señalado.current = null;
        capa.changed();
      }
    };

    const enMover = (e) => {
      if (e.dragging) return apagar();
      const f = mapa.forEachFeatureAtPixel(e.pixel, (feat) => feat, {
        layerFilter: (l) => l === capa,
      });
      if (!f) return apagar();
      if (f !== señalado.current) {
        señalado.current = f;
        capa.changed();
      }
      caja.innerHTML = rotulo(f.getProperties(), lluviaRef.current[f.get("CVEGEO")]);
      globo.setPosition(e.coordinate);
      return undefined;
    };

    const enClic = (e) => {
      const f = mapa.forEachFeatureAtPixel(e.pixel, (feat) => feat, {
        layerFilter: (l) => l === capa,
      });
      if (f && alClic.current) alClic.current(f.getProperties());
    };

    mapa.on("pointermove", enMover);
    mapa.on("singleclick", enClic);
    mapa.getViewport().addEventListener("pointerleave", apagar);
    return () => {
      mapa.un("pointermove", enMover);
      mapa.un("singleclick", enClic);
      mapa.getViewport().removeEventListener("pointerleave", apagar);
      mapa.removeOverlay(globo);
      señalado.current = null;
    };
  }, [mapa, capa]);

  return null;
}

/* Los 271 polígonos no dependen del sondeo en pantalla: sin `memo`, cada avance
   del reproductor volvería a pasar por aquí. */
export default memo(CapaMunicipios);
