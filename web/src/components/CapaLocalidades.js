/**
 * Localidades del INEGI, rotuladas según el zoom.
 *
 * Sustituye la lista de catorce ciudades escrita a mano: son 6807 localidades
 * amanzanadas del sureste, y el criterio para decidir cuáles se ven es el área
 * de su mancha urbana (`area_km2`, que calcula `descarga_inegi.py`). No es
 * población —el WFS del INEGI no publica ninguna— pero ordena igual de bien:
 * Mérida 250 km², Cancún 152, Playa del Carmen 57.
 *
 * Cuando cada rótulo era un nodo del DOM había que recortarlos por el encuadre
 * y topar su número a mano, y los cortes prudentes que eso obligaba a poner
 * dejaban al zoom de arranque apenas una docena de nombres grises: la capa no
 * se apreciaba. Aquí se pintan en el lienzo y la capa va con `declutter`, que
 * es quien decide qué cabe sin solaparse; eso permite bajar los umbrales —hay
 * nombres a cualquier zoom— sin que el mapa se emborrone, y el `zIndex` por
 * tamaño hace que en un empate gane la ciudad mayor. El halo oscuro del rótulo
 * es lo que lo mantiene legible cuando le pasa un eco por debajo.
 */
import { memo, useMemo } from "react";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import CircleStyle from "ol/style/Circle";
import Fill from "ol/style/Fill";
import Style from "ol/style/Style";
import { useCapa, useMapa } from "../mapa/contexto";
import { DATOS, NIVEL, VISTA } from "../mapa/geo";
import { rotulo, SANS } from "../mapa/estilos";
import { RUTAS, useGeo } from "../lib/inegi";

/* Área mínima (km²) para que una localidad opte a rótulo en cada zoom. Los
   cortes salen de mirar la península: en 6 sólo quedan las capitales y a partir
   de 11 aparecen las rancherías. Son generosos a propósito —de lo que sobre se
   encarga el `declutter`—: el criterio es que nunca haya un hueco de mapa sin
   un nombre al que agarrarse. */
const UMBRALES = [
  [6, 20],
  [7, 7],
  [8, 2.5],
  [9, 1],
  [10, 0.4],
  [11, 0.15],
  [12, 0.05],
  [Infinity, 0],
];

const AREA_PRINCIPAL = 20; // por encima de esto el rótulo va destacado

const areaMinima = (zoom) => UMBRALES.find(([z]) => zoom <= z)[1];

/* Prioridad en el reparto: OpenLayers resuelve los solapes de mayor a menor
   `zIndex`, así que unos pocos escalones bastan para que Mérida no la desplace
   la ranchería de al lado. */
const prioridad = (area) => (area >= 20 ? 5 : area >= 5 ? 4 : area >= 1 ? 3 : area >= 0.2 ? 2 : 1);

const punto = (color, r) => new CircleStyle({ radius: r, fill: new Fill({ color }) });

const PRINCIPAL = punto("#dbe6ee", 2.6);
const SECUNDARIA = punto("#9fb3c2", 1.9);

/* Un estilo por rótulo, construido la primera vez que se dibuja. La clave lleva
   la prioridad además del nombre: hay decenas de localidades homónimas y no
   todas entran en el mismo escalón. */
const cache = new Map();
function estiloDe(nombre, area) {
  const clave = `${prioridad(area)}|${nombre}`;
  if (!cache.has(clave)) {
    const pri = area >= AREA_PRINCIPAL;
    cache.set(
      clave,
      new Style({
        image: pri ? PRINCIPAL : SECUNDARIA,
        text: rotulo({
          texto: nombre,
          fuente: SANS,
          color: pri ? "#e4edf5" : "#a8bccb",
          tam: pri ? 11.5 : 10,
          peso: pri ? 600 : 400,
          dx: pri ? 8 : 6,
        }),
        zIndex: prioridad(area),
      })
    );
  }
  return cache.get(clave);
}

function CapaLocalidades() {
  const mapa = useMapa();
  const geo = useGeo(RUTAS.localidades);
  const formato = useMemo(() => new GeoJSON({ dataProjection: DATOS, featureProjection: VISTA }), []);

  useCapa(() => {
    if (!geo || !mapa) return null;
    return new VectorLayer({
      zIndex: NIVEL.localidades,
      declutter: true,
      source: new VectorSource({
        features: formato.readFeatures(geo),
        attributions: 'localidades: <a href="https://www.inegi.org.mx/">INEGI</a>',
      }),
      /* El recorte por encuadre lo hace ya la propia fuente (sólo se estilan
         las localidades del extent visible), así que aquí basta el corte por
         tamaño. */
      style: (f, resolucion) => {
        const area = f.get("area_km2");
        if (!(area >= areaMinima(mapa.getView().getZoomForResolution(resolucion)))) return null;
        return estiloDe(f.get("NOMGEO"), area);
      },
    });
  }, [geo, formato, mapa]);

  return null;
}

export default memo(CapaLocalidades);
