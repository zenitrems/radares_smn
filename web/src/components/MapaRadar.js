/**
 * Escenario de la consola: mapa base oscuro + el GIF del sondeo colocado sobre
 * sus `bounds` reales (los sondeos del SMN son PNG/GIF transparentes
 * georreferenciados, no imágenes planas), más las capas vectoriales del diseño.
 */
import { memo, useEffect, useMemo, useRef } from "react";
import {
  Circle,
  ImageOverlay,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { CIUDADES, destino, rumbo } from "../lib/radar";

const TILES = "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png";
const TILES_LBL = "https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png";
const ATRIB =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a> · sondeos: SMN/CONAGUA';

const ESCALAS_KM = [1, 2, 5, 10, 20, 25, 50, 100, 150, 200, 250, 500, 1000];

const icono = (className, html, size = [0, 0], anchor = [0, 0]) =>
  L.divIcon({ className, html, iconSize: size, iconAnchor: anchor });

const limites = (producto) => L.latLngBounds(producto.map.bounds[0], producto.map.bounds[1]);

/* Reencuadra al cambiar de producto o radar. */
function AjusteVista({ producto }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(limites(producto), { padding: [8, 8], animate: false });
  }, [map, producto]);
  return null;
}

/* Lectura de cursor y barra de escala. */
function Sensor({ radar, onCursor, onEscala }) {
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
      const { km, az } = rumbo(radar.markerCenter, [lat, lng]);
      onCursor(
        `<b>${lat.toFixed(3)}°N ${Math.abs(lng).toFixed(3)}°W</b><br>${km.toFixed(0)} km · ${az.toFixed(
          0
        )}° del sitio`
      );
    },
    mouseout: () => onCursor(null),
  });

  return null;
}

/* Las capas vectoriales se memoizan: sin esto cada avance de sondeo recrearía
   los iconos y Leaflet reconstruiría el DOM de todos los marcadores. */
const Anillos = memo(function Anillos({ radar, producto }) {
  const centro = radar.markerCenter;
  const rangos = [150, 300, 450].filter((r) => r <= producto.range);

  return (
    <>
      {rangos.map((r) => (
        <Circle
          key={r}
          center={centro}
          radius={r * 1000}
          interactive={false}
          pathOptions={{
            color: "rgba(245,165,36,.34)",
            weight: 0.9,
            fill: false,
            dashArray: r === producto.range ? null : "4 5",
          }}
        />
      ))}
      {rangos.map((r) => (
        <Marker
          key={`lbl-${r}`}
          position={destino(centro, r, 0)}
          interactive={false}
          keyboard={false}
          icon={icono("mk-rotulo", `<b>${r} km</b>`)}
        />
      ))}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((az) => (
        <Polyline
          key={`az-${az}`}
          positions={[centro, destino(centro, producto.range, az)]}
          interactive={false}
          pathOptions={{ color: "rgba(245,165,36,.10)", weight: 0.7 }}
        />
      ))}
    </>
  );
});

const Reticula = memo(function Reticula({ producto }) {
  const [[n, w], [s, e]] = producto.map.bounds;
  const paso = producto.range >= 450 ? 2 : 1;
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

const Ciudades = memo(function Ciudades({ producto }) {
  const visibles = CIUDADES.filter((c) => c.r === 1 || producto.range < 450);
  return (
    <>
      {visibles.map((c) => (
        <Marker
          key={c.n}
          position={c.c}
          interactive={false}
          keyboard={false}
          icon={icono(`mk-ciudad${c.r === 1 ? " pri" : ""}`, `<i></i><b>${c.n}</b>`)}
        />
      ))}
    </>
  );
});

export default function MapaRadar({
  radar,
  producto,
  frames,
  idx,
  capas,
  onCursor,
  onEscala,
  onListo,
}) {
  const bounds = useMemo(() => limites(producto), [producto]);
  const iconoSitio = useMemo(
    () =>
      icono(
        "mk-sitio",
        `<i></i><b>${radar.showName.replace("Radar ", "").toUpperCase()}</b>`,
        [12, 12],
        [6, 6]
      ),
    [radar]
  );
  const precargados = useRef(new Set());

  /* Precarga en caché para que la reproducción no parpadee. */
  useEffect(() => {
    frames.forEach((f) => {
      if (precargados.current.has(f.src)) return;
      precargados.current.add(f.src);
      const img = new window.Image();
      img.src = f.src;
    });
  }, [frames]);

  /* Solo se montan los sondeos vecinos: cada GIF son 2000×2000 px decodificados. */
  const montados = useMemo(() => {
    const s = new Set();
    if (frames.length === 0) return s;
    [idx - 1, idx, idx + 1, 0, frames.length - 1].forEach((i) => {
      if (i >= 0 && i < frames.length) s.add(i);
    });
    return s;
  }, [idx, frames.length]);

  return (
    <MapContainer
      center={producto.map.center}
      zoom={producto.map.zoom ?? 8}
      bounds={bounds}
      zoomSnap={0.25}
      zoomControl
      attributionControl
      preferCanvas
      whenReady={onListo}
      style={{ height: "100%", width: "100%" }}
    >
      {capas.base && (
        <TileLayer url={TILES} attribution={ATRIB} subdomains="abcd" maxZoom={19} />
      )}

      {frames.map((f, i) =>
        montados.has(i) ? (
          <ImageOverlay
            key={f.src}
            url={f.src}
            bounds={bounds}
            opacity={i === idx ? 1 : 0}
            interactive={false}
            className="eco-overlay"
          />
        ) : null
      )}

      {capas.etiquetas && <TileLayer url={TILES_LBL} subdomains="abcd" maxZoom={19} pane="shadowPane" />}
      {capas.grid && <Reticula producto={producto} />}
      {capas.anillos && <Anillos radar={radar} producto={producto} />}
      {capas.ciudades && <Ciudades producto={producto} />}
      {capas.sitio && (
        <Marker position={radar.markerCenter} interactive={false} keyboard={false} icon={iconoSitio} />
      )}

      <AjusteVista producto={producto} />
      <Sensor radar={radar} onCursor={onCursor} onEscala={onEscala} />
    </MapContainer>
  );
}
