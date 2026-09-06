/**
 * Escenario de la consola: los GIF de sondeo colocados sobre sus `bounds`
 * reales (los sondeos del SMN son PNG/GIF transparentes georreferenciados, no
 * imágenes planas), más las capas vectoriales del diseño.
 *
 */
import { memo, useEffect, useMemo, useRef } from "react";
import {
  Circle,
  ImageOverlay,
  MapContainer,
  Marker,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import CapaAeropuertos from "./CapaAeropuertos";
import CapaBase from "./CapaBase";
import CapaCosta from "./CapaCosta";
import CapaLocalidades from "./CapaLocalidades";
import CapaMunicipios from "./CapaMunicipios";
import { destino, rumbo } from "../lib/radar";

/* Instrumentación del radar: anillos y radiales en el azul de la consola, a
   baja opacidad para no competir con los ecos. */
const ANILLO = "rgba(76,141,246,.34)";
const RADIAL = "rgba(76,141,246,.10)";

const ESCALAS_KM = [1, 2, 5, 10, 20, 25, 50, 100, 150, 200, 250, 500, 1000];

const icono = (className, html, size = [0, 0], anchor = [0, 0]) =>
  L.divIcon({ className, html, iconSize: size, iconAnchor: anchor });

const aLimites = (bounds) => L.latLngBounds(bounds[0], bounds[1]);

/* Referencia estable: un {} literal por defecto remontaría la capa municipal
   en cada render del mapa. */
const VACIO = {};

/* Reencuadra al cambiar de producto, de radar o de vista — pero no en cada
   refresco del catálogo: este llega cada minuto con objetos `bounds` nuevos
   aunque valgan lo mismo, y si se comparase por referencia se perdería el
   zoom/posición que el usuario haya elegido a mano. */
function AjusteVista({ bounds }) {
  const map = useMap();
  const previa = useRef(null);
  useEffect(() => {
    const clave = JSON.stringify(bounds);
    if (previa.current === clave) return;
    previa.current = clave;
    map.fitBounds(aLimites(bounds), { padding: [8, 8], animate: false });
  }, [map, bounds]);
  return null;
}

/* Botón para volver a encuadrar el sitio actual sin esperar a que cambie el
   producto: útil después de que el usuario haya paneado o hecho zoom a mano. */
function ControlCentrar({ bounds }) {
  const map = useMap();
  const previa = useRef(bounds);
  previa.current = bounds;

  useEffect(() => {
    const Control = L.Control.extend({
      onAdd() {
        const div = L.DomUtil.create("div", "leaflet-bar leaflet-control");
        const a = L.DomUtil.create("a", "", div);
        a.href = "#";
        a.title = "Centrar en el radar";
        a.setAttribute("role", "button");
        a.setAttribute("aria-label", "Centrar en el radar");
        a.innerHTML =
          '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8" cy="8" r="3.2"/><path d="M8 1v2.6M8 12.4V15M1 8h2.6M12.4 8H15"/></svg>';
        L.DomEvent.disableClickPropagation(div);
        L.DomEvent.on(a, "click", (e) => {
          L.DomEvent.preventDefault(e);
          map.fitBounds(aLimites(previa.current), { padding: [8, 8], animate: true });
        });
        return div;
      },
    });
    const control = new Control({ position: "topleft" });
    control.addTo(map);
    return () => control.remove();
  }, [map]);

  return null;
}

/* Límite geográfico del escenario: por ahora no hace falta poder alejarse
   hasta ver el planeta, solo la península y el alcance de los radares. */
function LimiteMapa({ caja }) {
  const map = useMap();
  const limites = useMemo(() => aLimites(caja), [caja]);

  useEffect(() => {
    map.setMaxBounds(limites);
    const ajustarZoomMinimo = () => map.setMinZoom(map.getBoundsZoom(limites, false));
    ajustarZoomMinimo();
    map.on("resize", ajustarZoomMinimo);
    return () => map.off("resize", ajustarZoomMinimo);
  }, [map, limites]);

  return null;
}

/* El panel lateral se pliega, y Leaflet no se entera: su evento `resize` viene
   de la ventana, no del contenedor. */
function AjusteTamaño() {
  const map = useMap();
  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map]);
  return null;
}

/* Lectura de cursor (respecto al sitio más cercano) y barra de escala. */
function Sensor({ sitios, onCursor, onEscala }) {
  const map = useMap();

  const medir = () => {
    const y = map.getSize().y / 2;
    const a = map.containerPointToLatLng([0, y]);
    const b = map.containerPointToLatLng([100, y]);
    const kmPor100px = a.distanceTo(b) / 1000;
    if (!kmPor100px) return;
    const km = [...ESCALAS_KM].reverse().find((v) => v <= kmPor100px) ?? ESCALAS_KM[0];
    onEscala({ px: Math.round((100 * km) / kmPor100px), txt: `${km} km` });
  };

  useEffect(medir, [map]); // eslint-disable-line react-hooks/exhaustive-deps

  useMapEvents({
    zoomend: medir,
    resize: medir,
    mousemove: (e) => {
      const { lat, lng } = e.latlng;
      const cerca = sitios
        .map((s) => ({ s, ...rumbo(s.radar.markerCenter, [lat, lng]) }))
        .sort((a, b) => a.km - b.km)[0];
      if (!cerca) return;
      const sitio = sitios.length > 1 ? `${cerca.s.radar.estacion} · ` : "";
      onCursor(
        `<b>${lat.toFixed(3)}°N ${Math.abs(lng).toFixed(3)}°W</b><br>${sitio}${cerca.km.toFixed(
          0
        )} km · ${cerca.az.toFixed(0)}° del sitio`
      );
    },
    mouseout: () => onCursor(null),
  });

  return null;
}

/* Las capas vectoriales se memoizan: sin esto cada avance de sondeo recrearía
   los iconos y Leaflet reconstruiría el DOM de todos los marcadores. */
const Anillos = memo(function Anillos({ sitios }) {
  return (
    <>
      {sitios.flatMap((s) => {
        const centro = s.radar.markerCenter;
        const rangos = [150, 300, 450].filter((r) => r <= s.producto.range);
        return [
          ...rangos.map((r) => (
            <Circle
              key={`${s.id}-c${r}`}
              center={centro}
              radius={r * 1000}
              interactive={false}
              pathOptions={{
                color: ANILLO,
                weight: 0.9,
                fill: false,
                dashArray: r === s.producto.range ? null : "4 5",
              }}
            />
          )),
          ...rangos.map((r) => (
            <Marker
              key={`${s.id}-l${r}`}
              position={destino(centro, r, 0)}
              interactive={false}
              keyboard={false}
              icon={icono("mk-rotulo", `<b>${r} km</b>`)}
            />
          )),
          ...[0, 45, 90, 135, 180, 225, 270, 315].map((az) => (
            <Polyline
              key={`${s.id}-a${az}`}
              positions={[centro, destino(centro, s.producto.range, az)]}
              interactive={false}
              pathOptions={{ color: RADIAL, weight: 0.7 }}
            />
          )),
        ];
      })}
    </>
  );
});

const Reticula = memo(function Reticula({ bounds, paso }) {
  const [[n, w], [s, e]] = bounds;
  const norte = Math.max(n, s);
  const sur = Math.min(n, s);
  const oeste = Math.min(w, e);
  const este = Math.max(w, e);

  const paralelos = [];
  for (let lat = Math.ceil(sur / paso) * paso; lat <= norte; lat += paso) paralelos.push(lat);
  const meridianos = [];
  for (let lon = Math.ceil(oeste / paso) * paso; lon <= este; lon += paso) meridianos.push(lon);

  const trazo = { color: "#20303b", weight: 0.6, dashArray: "2 4", interactive: false };

  return (
    <>
      {paralelos.map((lat) => (
        <Polyline
          key={`p${lat}`}
          positions={[
            [lat, oeste],
            [lat, este],
          ]}
          pathOptions={trazo}
          interactive={false}
        />
      ))}
      {meridianos.map((lon) => (
        <Polyline
          key={`m${lon}`}
          positions={[
            [norte, lon],
            [sur, lon],
          ]}
          pathOptions={trazo}
          interactive={false}
        />
      ))}
      {paralelos.map((lat) => (
        <Marker
          key={`pl${lat}`}
          position={[lat, oeste]}
          interactive={false}
          keyboard={false}
          icon={icono("mk-grid", `<b>${lat}°N</b>`, [0, 0], [-4, 10])}
        />
      ))}
      {meridianos.map((lon) => (
        <Marker
          key={`ml${lon}`}
          position={[sur, lon]}
          interactive={false}
          keyboard={false}
          icon={icono("mk-grid", `<b>${Math.abs(lon)}°W</b>`, [0, 0], [-4, -4])}
        />
      ))}
    </>
  );
});

const Sitios = memo(function Sitios({ sitios }) {
  return (
    <>
      {sitios.map((s) => (
        <Marker
          key={s.id}
          position={s.radar.markerCenter}
          interactive={false}
          keyboard={false}
          icon={icono(
            "mk-sitio",
            `<i></i><b>${s.radar.showName.replace("Radar ", "").toUpperCase()}</b>`,
            [12, 12],
            [6, 6]
          )}
        />
      ))}
    </>
  );
});

/* Ecos de un sitio: solo se montan los sondeos vecinos al actual, porque cada
   GIF son 2000×2000 px decodificados. El resto se precarga en caché. */
function EcoSitio({ sitio }) {
  const { producto, frames, idx } = sitio;
  const bounds = useMemo(() => aLimites(producto.map.bounds), [producto]);
  const precargados = useRef(new Set());

  useEffect(() => {
    frames.forEach((f) => {
      if (precargados.current.has(f.src)) return;
      precargados.current.add(f.src);
      const img = new window.Image();
      img.src = f.src;
    });
  }, [frames]);

  const montados = useMemo(() => {
    const s = new Set();
    if (frames.length === 0) return s;
    [idx - 1, idx, idx + 1, 0, frames.length - 1].forEach((i) => {
      if (i >= 0 && i < frames.length) s.add(i);
    });
    return s;
  }, [idx, frames.length]);

  return (
    <>
      {frames.map((f, i) =>
        montados.has(i) ? (
          <ImageOverlay
            key={f.src}
            url={f.src}
            bounds={bounds}
            opacity={i === idx ? sitio.opacidad ?? 1 : 0}
            interactive={false}
            className="eco-overlay"
          />
        ) : null
      )}
    </>
  );
}

export default function MapaRadar({
  sitios,
  vista,
  caja,
  capas,
  mapaBase,
  lluvia = VACIO,
  onMunicipio,
  onCursor,
  onEscala,
  onListo,
}) {
  /* La geometría solo depende de qué sitios y productos hay, no del sondeo en
     pantalla: se aísla del `idx` para que la reproducción no la redibuje. */
  const clave = sitios.map((s) => `${s.id}:${s.producto.urlName}`).join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const geo = useMemo(
    () => sitios.map(({ id, radar, producto }) => ({ id, radar, producto })),
    [clave]
  );
  const rangoMax = Math.max(...geo.map((s) => s.producto.range), 300);
  const centroVista = useMemo(
    () => [(vista[0][0] + vista[1][0]) / 2, (vista[0][1] + vista[1][1]) / 2],
    [vista]
  );

  return (
    <MapContainer
      center={centroVista}
      zoom={7}
      bounds={aLimites(vista)}
      zoomSnap={0.25}
      zoomControl
      attributionControl
      preferCanvas
      maxBoundsViscosity={1}
      whenReady={onListo}
      style={{ height: "100%", width: "100%" }}
    >
      {caja && <LimiteMapa caja={caja} />}
      <ControlCentrar bounds={vista} />
      <AjusteTamaño />
      <CapaBase id={mapaBase} />

      {sitios.map((s) => (s.visible === false ? null : <EcoSitio key={s.id} sitio={s} />))}

      {capas.costa && <CapaCosta />}
      {capas.municipios && <CapaMunicipios lluvia={lluvia} onMunicipio={onMunicipio} />}

      {capas.grid && <Reticula bounds={vista} paso={rangoMax >= 450 ? 2 : 1} />}
      {capas.anillos && <Anillos sitios={geo} />}
      {capas.localidades && <CapaLocalidades />}
      {capas.aeropuertos && <CapaAeropuertos />}
      {capas.sitio && <Sitios sitios={geo} />}

      <AjusteVista bounds={vista} />
      <Sensor sitios={sitios} onCursor={onCursor} onEscala={onEscala} />
    </MapContainer>
  );
}
