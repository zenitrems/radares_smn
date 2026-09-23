/**
 * Estaciones automáticas 
 *
 * La antigüedad de la lectura importa tanto como el valor: una estación que no
 * reporta hace días no puede presentarse como si fuera la condición actual. Por
 * eso el marcador se apaga en dos escalones (fresca/desactualizada/vieja) en
 * vez de mostrar siempre el último dato, por viejo que esté — la vieja además
 * pierde los números de temperatura y humedad, que es el propio filtro de
 * "dato no disponible" pedido: se sigue viendo la estación, no su lectura.
 */
import { memo, useEffect, useRef } from "react";
import Feature from "ol/Feature";
import Overlay from "ol/Overlay";
import Point from "ol/geom/Point";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import CircleStyle from "ol/style/Circle";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import { useCapa, useMapa } from "../mapa/contexto";
import { aVista, NIVEL } from "../mapa/geo";
import { FONDO, MONO, rotulo } from "../mapa/estilos";
import { useEstaciones } from "../lib/estaciones";
import { minutosDesde, textoAntiguedad } from "../lib/radar";

// Más de un ciclo de ingesta (30 min por omisión) con margen: normal que una
// estación tarde en publicar, no motivo para atenuarla todavía.
const MIN_DESACTUALIZADA = 90;
// Pasado esto ya no es "la condición actual": se trata como sin dato.
const MIN_VIEJA = 360;

const frescura = (min) => (min > MIN_VIEJA ? "vieja" : min > MIN_DESACTUALIZADA ? "desactualizada" : "fresca");

const ROJO = { fresca: "#f0506e", desactualizada: "rgba(240,80,110,.55)" }; // temperatura
const VERDE = { fresca: "#8fe08a", desactualizada: "rgba(143,224,138,.55)" }; // humedad
const GRIS = { fresca: "#9fb3c2", desactualizada: "rgba(159,179,194,.55)", vieja: "rgba(159,179,194,.4)" }; // nombre

const PUNTO = new Style({
  image: new CircleStyle({
    radius: 2.6,
    fill: new Fill({ color: "#dbe6ee" }),
    stroke: new Stroke({ color: FONDO, width: 1 }),
  }),
});
const PUNTO_VIEJO = new Style({
  image: new CircleStyle({
    radius: 2.2,
    fill: new Fill({ color: "rgba(219,230,238,.35)" }),
    stroke: new Stroke({ color: FONDO, width: 1 }),
  }),
});

const cache = new Map();
function estiloDe(nombre, temp, hum, estado) {
  const clave = `${nombre}|${temp}|${hum}|${estado}`;
  if (!cache.has(clave)) {
    const estilos = [estado === "vieja" ? PUNTO_VIEJO : PUNTO];
    if (estado !== "vieja") {
      if (temp != null) {
        estilos.push(
          new Style({
            text: rotulo({ texto: `${Math.round(temp)}°`, color: ROJO[estado], tam: 10.5, dx: -7, dy: -8, align: "right" }),
          })
        );
      }
      if (hum != null) {
        estilos.push(
          new Style({
            text: rotulo({ texto: `${Math.round(hum)}%`, color: VERDE[estado], tam: 10.5, dx: -7, dy: 8, align: "right" }),
          })
        );
      }
    }
    estilos.push(new Style({ text: rotulo({ texto: nombre, fuente: MONO, color: GRIS[estado], tam: 9, dx: 7 }) }));
    cache.set(clave, estilos);
  }
  return cache.get(clave);
}

function featureDe(e) {
  const f = new Feature(new Point(aVista([e.lat, e.lon])));
  f.setStyle(estiloDe(e.nombre_estacion, e.temperatura, e.humedad, frescura(minutosDesde(e.fecha_utc))));
  f.setProperties(e, true);
  return f;
}

/* "sin dato" en vez de un hueco: que la ausencia sea explícita y no parezca
   un cero. */
const campo = (valor, unidad, decimales = 1) =>
  valor == null ? '<span class="sin">sin dato</span>' : `${Number(valor).toFixed(decimales)} ${unidad}`;

function contenidoDe(e) {
  const min = minutosDesde(e.fecha_utc);
  const estado = frescura(min);
  const lugar = [e.municipio, e.estado].filter(Boolean).join(" · ");
  return `
    <b>${e.nombre_estacion}</b>
    <span>${lugar || e.estacion_m}</span>
    <span class="edad ${estado}">${textoAntiguedad(min)}</span>
    <table>
      <tr><td>temperatura</td><td class="v">${campo(e.temperatura, "°C")}</td></tr>
      <tr><td>humedad</td><td class="v">${campo(e.humedad, "%", 0)}</td></tr>
      <tr><td>presión</td><td class="v">${campo(e.presion, "hPa")}</td></tr>
      <tr><td>precipitación</td><td class="v">${campo(e.precipitacion, "mm")}</td></tr>
      <tr><td>radiación</td><td class="v">${campo(e.radiacion, "W/m²", 0)}</td></tr>
      <tr><td>dir. viento</td><td class="v">${campo(e.viento_dir, "°", 0)}</td></tr>
      <tr><td>vel. viento</td><td class="v">${campo(e.viento_vel, "km/h")}</td></tr>
      <tr><td>dir. ráfaga</td><td class="v">${campo(e.racha_dir, "°", 0)}</td></tr>
      <tr><td>vel. ráfaga</td><td class="v">${campo(e.racha_vel, "km/h")}</td></tr>
    </table>
  `;
}

function CapaEstaciones() {
  const mapa = useMapa();
  const estaciones = useEstaciones();
  const fuente = useRef(new VectorSource());

  const capa = useCapa(
    () => new VectorLayer({ zIndex: NIVEL.estaciones, declutter: true, source: fuente.current }),
    []
  );

  useEffect(() => {
    fuente.current.clear();
    fuente.current.addFeatures(estaciones.map(featureDe));
  }, [estaciones]);

  /* Tarjeta flotante con el detalle de la estación bajo el puntero */
  useEffect(() => {
    if (!mapa || !capa) return undefined;

    const caja = document.createElement("div");
    caja.className = "tt-estacion";
    const globo = new Overlay({
      element: caja,
      offset: [0, -12],
      positioning: "bottom-center",
      className: "tt-capa",
    });
    mapa.addOverlay(globo);

    const señalado = { current: null };
    const apagar = () => globo.setPosition(undefined);

    const enMover = (e) => {
      if (e.dragging) return apagar();
      const f = mapa.forEachFeatureAtPixel(e.pixel, (feat) => feat, {
        layerFilter: (l) => l === capa,
      });
      if (!f) return apagar();
      señalado.current = f;
      caja.innerHTML = contenidoDe(f.getProperties());
      globo.setPosition(e.coordinate);
      return undefined;
    };

    mapa.on("pointermove", enMover);
    mapa.getViewport().addEventListener("pointerleave", apagar);
    return () => {
      mapa.un("pointermove", enMover);
      mapa.getViewport().removeEventListener("pointerleave", apagar);
      mapa.removeOverlay(globo);
    };
  }, [mapa, capa]);

  return null;
}

export default memo(CapaEstaciones);
