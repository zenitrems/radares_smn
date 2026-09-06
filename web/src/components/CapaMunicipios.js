/**
 * Capa de división municipal sobre el escenario del radar.
 *
 * Sirve para tres cosas: sustituir al mapa base de teselas (la consola ya no
 * carga ninguno), dar referencia territorial a los ecos (dónde está cayendo, no
 * sólo a cuántos km del sitio) y ser el soporte del mapeo de lluvia por
 * municipio — `lluvia` es un objeto CVEGEO → mm·h⁻¹ y los municipios con dato
 * se rellenan con la escala del SMN.
 *
 * El GeoJSON se carga una vez por sesión (lib/inegi) y se monta sólo cuando la
 * casilla está encendida, porque son 2.7 MB y ~145 mil vértices.
 */
import { memo, useCallback, useEffect, useRef } from "react";
import { GeoJSON } from "react-leaflet";
import { RUTAS, useGeo } from "../lib/inegi";
import { tramoDeLluvia } from "../lib/municipios";

const TRAZO = "rgba(138,172,202,.62)";
const TRAZO_ACTIVO = "#2DD4BF";
const RESALTE = { color: TRAZO_ACTIVO, weight: 1.6 };

/* Sin dato el municipio va sin relleno: los ecos de radar quedan debajo y
   taparlos con una lámina de color sería contraproducente. */
function estiloDe(feature, lluvia) {
  const tramo = tramoDeLluvia(lluvia[feature.properties.CVEGEO]);
  return {
    color: TRAZO,
    weight: 0.85,
    fillColor: tramo ? tramo.color : "#000",
    fillOpacity: tramo ? 0.45 : 0,
    /* Sin relleno no hay nada que capturar el cursor salvo el propio trazo, y
       aun así conviene poder señalar el municipio: el relleno transparente
       sigue siendo interactivo en Leaflet. */
    fill: true,
    smoothFactor: 1.6,
  };
}

const rotulo = (props, mm) => {
  const tramo = tramoDeLluvia(mm);
  const lluviaTxt = tramo
    ? `<i>${mm.toFixed(1)} mm·h⁻¹ · ${tramo.lb}</i>`
    : '<i class="sin">sin dato de lluvia</i>';
  return `<b>${props.NOMGEO}</b><span>${props.NOM_ENT} · ${props.CVEGEO}</span>${lluviaTxt}`;
};

function CapaMunicipios({ lluvia, onMunicipio }) {
  const geo = useGeo(RUTAS.municipios);
  const capa = useRef(null);

  /* `lluvia` en una ref además del estado: los manejadores se registran una
     sola vez en onEachFeature y de otro modo se quedarían con el objeto del
     primer render. */
  const lluviaRef = useRef(lluvia);
  lluviaRef.current = lluvia;

  /* El municipio señalado, para poder devolverle el resalte después de
     cualquier reestilizado de la capa (ver abajo). */
  const señalado = useRef(null);

  /* La función de estilo se memoiza por `lluvia`: react-leaflet compara la
     identidad de `style` y, si cambia, reestiliza la capa entera — lo que
     borraba el resalte. Con una arrow inline eso ocurría en cada render del
     mapa, y la consola re-renderiza con cada movimiento del cursor (la lectura
     de posición del encabezado), así que el contorno no llegaba a verse. */
  const estilo = useCallback((f) => estiloDe(f, lluvia), [lluvia]);

  /* Recolorea al llegar datos nuevos sin volver a montar los 130 polígonos. */
  useEffect(() => {
    if (!capa.current) return;
    capa.current.setStyle(estilo);
    capa.current.eachLayer((l) => {
      if (l.getTooltip()) {
        l.setTooltipContent(rotulo(l.feature.properties, lluvia[l.feature.properties.CVEGEO]));
      }
    });
    if (señalado.current) señalado.current.setStyle(RESALTE);
  }, [geo, lluvia, estilo]);

  if (!geo) return null;

  return (
    <GeoJSON
      ref={capa}
      data={geo}
      attribution='división municipal: <a href="https://www.inegi.org.mx/">INEGI</a> · sondeos: SMN/CONAGUA'
      style={estilo}
      onEachFeature={(feature, layer) => {
        layer.bindTooltip(rotulo(feature.properties, lluviaRef.current[feature.properties.CVEGEO]), {
          sticky: true,
          direction: "top",
          className: "tt-municipio",
        });
        layer.on({
          mouseover: (e) => {
            señalado.current = e.target;
            e.target.setStyle(RESALTE);
            /* En el lienzo el orden de dibujo es el de alta: sin esto el trazo
               del municipio vecino repasa por encima del borde resaltado. */
            e.target.bringToFront();
          },
          mouseout: (e) => {
            if (señalado.current === e.target) señalado.current = null;
            e.target.setStyle(estiloDe(feature, lluviaRef.current));
          },
          click: () => onMunicipio && onMunicipio(feature.properties),
        });
      }}
    />
  );
}

/* Los 130 polígonos no dependen del sondeo en pantalla: sin `memo`, cada avance
   del reproductor volvería a pasar por aquí. */
export default memo(CapaMunicipios);
