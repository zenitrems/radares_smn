/* Constantes de la consola y utilidades geográficas compartidas. */


/**
 * Capas superpuestas, en dos familias que el panel muestra por separado: lo
 * que dibuja el territorio (geografía, del INEGI por `descarga_inegi.py`) y lo
 * que dibuja el instrumento. El mapa base va aparte, en lib/mapas: es una
 * elección entre opciones, no una lista de casillas.
 */
export const GRUPOS_CAPAS = [
  {
    id: "geografia",
    lb: "Geografía",
    capas: [
      { id: "municipios", lb: "División municipal", on: true },
      { id: "costa", lb: "Línea de costa y frontera", on: true },
      { id: "localidades", lb: "Localidades", on: true },
      { id: "aeropuertos", lb: "Aeropuertos", on: true },
    ],
  },
  {
    id: "radar",
    lb: "Radar",
    capas: [
      { id: "anillos", lb: "Anillos de rango 150/300/450 km", on: true },
      { id: "sitio", lb: "Sitio del radar", on: true },
      { id: "grid", lb: "Retícula lat/lon", on: false },
      { id: "escala", lb: "Escala de color", on: true },
    ],
  },
];

/* Lista plana, para el estado inicial de las casillas. */
export const CAPAS = GRUPOS_CAPAS.flatMap((g) => g.capas);

export const VELOCIDADES = [0.5, 1, 2, 4];

/* Ventanas de tiempo del reproductor. `horas: null` = todos los sondeos en disco. */
export const VENTANAS = [
  { id: "todo", lb: "todos", horas: null },
  { id: "3h", lb: "últimas 3 h", horas: 3 },
  { id: "1h", lb: "última hora", horas: 1 },
];

/** Encuadre que cubre todos los `bounds` dados: [[norte,oeste],[sur,este]]. */
export function unirLimites(listaBounds) {
  const lats = listaBounds.flatMap((b) => [b[0][0], b[1][0]]);
  const lons = listaBounds.flatMap((b) => [b[0][1], b[1][1]]);
  return [
    [Math.max(...lats), Math.min(...lons)],
    [Math.min(...lats), Math.max(...lons)],
  ];
}

/**
 * Caja que acota el escenario a la península y el alcance de los radares del
 * catálogo, con un margen de contexto.
 *
 * El margen es proporcional al tamaño del encuadre (no un número fijo de
 * grados): con un margen chico, el producto de mayor rango de un radar puede
 * tocar casi el borde de la caja, y ahí `fitBounds` choca con `maxBounds` —
 * Leaflet recorta el centro para no salirse y el mapa queda descentrado en
 * vez de encuadrar el sitio.
 */
export function limiteCatalogo(catalogo, margenFrac = 0.35) {
  const bounds = catalogo.radars.flatMap((r) => r.products.map((p) => p.map.bounds));
  if (bounds.length === 0) return null;
  const [[n, w], [s, e]] = unirLimites(bounds);
  const margenLat = (n - s) * margenFrac;
  const margenLon = (e - w) * margenFrac;
  return [
    [n + margenLat, w - margenLon],
    [s - margenLat, e + margenLon],
  ];
}

export const KM_POR_GRADO_LAT = 110.57;
export const KM_POR_GRADO_LON = 111.32;

export const pad = (n) => String(n).padStart(2, "0");

export function kmPorGradoLon(lat) {
  return KM_POR_GRADO_LON * Math.cos((lat * Math.PI) / 180);
}

/** Distancia y azimut (grados desde el norte) entre dos puntos, plano equirectangular. */
export function rumbo([lat0, lon0], [lat, lon]) {
  const dx = (lon - lon0) * kmPorGradoLon(lat0);
  const dy = (lat - lat0) * KM_POR_GRADO_LAT;
  return {
    km: Math.hypot(dx, dy),
    az: ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360,
  };
}

/** Punto a `km` del origen en el azimut dado. */
export function destino([lat0, lon0], km, azGrados) {
  const a = (azGrados * Math.PI) / 180;
  return [
    lat0 + (Math.cos(a) * km) / KM_POR_GRADO_LAT,
    lon0 + (Math.sin(a) * km) / kmPorGradoLon(lat0),
  ];
}

export function ventanaDeFrames(frames, ventanaId) {
  const v = VENTANAS.find((x) => x.id === ventanaId);
  if (!v || !v.horas || frames.length === 0) return frames;
  const corte = new Date(frames[frames.length - 1].t).getTime() - v.horas * 3600e3;
  const recorte = frames.filter((f) => new Date(f.t).getTime() >= corte);
  return recorte.length > 0 ? recorte : frames.slice(-1);
}

export const horaUtc = (iso) => {
  const d = new Date(iso);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};

export const fechaUtc = (iso) =>
  new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

/** Minutos transcurridos desde `iso` hasta ahora. */
export const minutosDesde = (iso) => (Date.now() - new Date(iso).getTime()) / 60000;

export function textoAntiguedad(min) {
  if (!isFinite(min)) return "—";
  if (min < 1) return "hace <1 min";
  if (min < 90) return `hace ${Math.round(min)} min`;
  const h = min / 60;
  if (h < 48) return `hace ${h.toFixed(1)} h`;
  return `hace ${Math.round(h / 24)} d`;
}

/** Intervalo mediano entre sondeos, en minutos. */
export function intervaloMediano(frames) {
  if (frames.length < 2) return null;
  const dt = [];
  for (let i = 1; i < frames.length; i++) {
    dt.push((new Date(frames[i].t) - new Date(frames[i - 1].t)) / 60000);
  }
  dt.sort((a, b) => a - b);
  return dt[Math.floor(dt.length / 2)];
}
