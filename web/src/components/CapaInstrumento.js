/**
 * Lo que dibuja el instrumento y no el territorio: anillos de rango con sus
 * radiales, retícula lat/lon y la marca del sitio.
 *
 * La geometría se construye con `destino`, la misma función con la que el
 * sensor del encabezado calcula la distancia al sitio: así el anillo de 300 km
 * cae exactamente donde el cursor lee 300 km. Los anillos van en el azul de la
 * consola y a baja opacidad para no competir con los ecos.
 */
import { memo, useMemo } from "react";
import Feature from "ol/Feature";
import LineString from "ol/geom/LineString";
import Point from "ol/geom/Point";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import CircleStyle from "ol/style/Circle";
import Fill from "ol/style/Fill";
import RegularShape from "ol/style/RegularShape";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import { useCapa } from "../mapa/contexto";
import { aVista, NIVEL } from "../mapa/geo";
import { MONO, rotulo, TEAL } from "../mapa/estilos";
import { destino } from "../lib/radar";

const ANILLO = "rgba(76,141,246,.34)";
const RADIAL = "rgba(76,141,246,.10)";

/* El anillo es la circunferencia de `destino` muestreada cada 2°: a 450 km y al
   zoom máximo del escenario la flecha del arco no llega al cuarto de píxel. */
const PASO_ANILLO = 2;

const anillo = (centro, km) => {
  const puntos = [];
  for (let az = 0; az <= 360; az += PASO_ANILLO) puntos.push(aVista(destino(centro, km, az)));
  return new LineString(puntos);
};

const trazo = (color, ancho, guion) =>
  new Style({ stroke: new Stroke({ color, width: ancho, lineDash: guion }) });

const CONTINUO = trazo(ANILLO, 0.9);
const PUNTEADO = trazo(ANILLO, 0.9, [4, 5]);
const RADIO = trazo(RADIAL, 0.7);
const MALLA = trazo("#20303b", 0.6, [2, 4]);

const conRotulo = (texto, color, dx, dy) =>
  new Style({ text: rotulo({ texto, fuente: MONO, color, tam: 9, dx, dy }) });

const marca = (feature, estilo) => {
  feature.setStyle(estilo);
  return feature;
};

const capaVectorial = (features, zIndex, extra) =>
  new VectorLayer({
    zIndex,
    source: new VectorSource({ features }),
    ...extra,
  });

export const CapaAnillos = memo(function CapaAnillos({ sitios }) {
  const features = useMemo(
    () =>
      sitios.flatMap((s) => {
        const centro = s.radar.markerCenter;
        const rangos = [150, 300, 450].filter((r) => r <= s.producto.range);
        return [
          ...rangos.map((r) =>
            marca(
              new Feature(anillo(centro, r)),
              r === s.producto.range ? CONTINUO : PUNTEADO
            )
          ),
          ...rangos.map((r) =>
            marca(
              new Feature(new Point(aVista(destino(centro, r, 0)))),
              conRotulo(`${r} km`, "rgba(122,166,224,.72)", 6, 8)
            )
          ),
          ...[0, 45, 90, 135, 180, 225, 270, 315].map((az) =>
            marca(
              new Feature(
                new LineString([aVista(centro), aVista(destino(centro, s.producto.range, az))])
              ),
              RADIO
            )
          ),
        ];
      }),
    [sitios]
  );

  useCapa(() => capaVectorial(features, NIVEL.anillos), [features]);
  return null;
});

export const CapaReticula = memo(function CapaReticula({ bounds, paso }) {
  const features = useMemo(() => {
    const [[n, w], [s, e]] = bounds;
    const norte = Math.max(n, s);
    const sur = Math.min(n, s);
    const oeste = Math.min(w, e);
    const este = Math.max(w, e);

    const salida = [];
    for (let lat = Math.ceil(sur / paso) * paso; lat <= norte; lat += paso) {
      salida.push(
        marca(new Feature(new LineString([aVista([lat, oeste]), aVista([lat, este])])), MALLA),
        marca(
          new Feature(new Point(aVista([lat, oeste]))),
          conRotulo(`${lat}°N`, "#3d505d", 8, -8)
        )
      );
    }
    for (let lon = Math.ceil(oeste / paso) * paso; lon <= este; lon += paso) {
      salida.push(
        marca(new Feature(new LineString([aVista([norte, lon]), aVista([sur, lon])])), MALLA),
        marca(
          new Feature(new Point(aVista([sur, lon]))),
          conRotulo(`${Math.abs(lon)}°W`, "#3d505d", 8, 8)
        )
      );
    }
    return salida;
  }, [bounds, paso]);

  useCapa(() => capaVectorial(features, NIVEL.reticula), [features]);
  return null;
});

/* Rombo con su halo, como el marcador CSS que sustituye. */
const HALO_SITIO = new Style({
  image: new CircleStyle({ radius: 11, fill: new Fill({ color: "rgba(45,212,191,.14)" }) }),
});
const ROMBO = new Style({
  image: new RegularShape({ points: 4, radius: 8.5, fill: new Fill({ color: TEAL }) }),
});

export const CapaSitios = memo(function CapaSitios({ sitios }) {
  const features = useMemo(
    () =>
      sitios.map((s) =>
        marca(new Feature(new Point(aVista(s.radar.markerCenter))), [
          HALO_SITIO,
          ROMBO,
          new Style({
            text: rotulo({
              texto: s.radar.showName.replace("Radar ", "").toUpperCase(),
              fuente: MONO,
              color: TEAL,
              tam: 10,
              dx: 16,
              dy: -13,
            }),
          }),
        ])
      ),
    [sitios]
  );

  useCapa(() => capaVectorial(features, NIVEL.sitios), [features]);
  return null;
});
