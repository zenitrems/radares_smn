/* Constantes de la consola y utilidades geográficas compartidas. */

export const CIUDADES = [
  { n: "Mérida", c: [20.97, -89.62], r: 1 },
  { n: "Cancún", c: [21.16, -86.85], r: 1 },
  { n: "Campeche", c: [19.84, -90.53], r: 1 },
  { n: "Chetumal", c: [18.5, -88.3], r: 1 },
  { n: "Cd. del Carmen", c: [18.65, -91.8], r: 2 },
  { n: "Playa del Carmen", c: [20.63, -87.07], r: 2 },
  { n: "Valladolid", c: [20.69, -88.2], r: 2 },
  { n: "Cozumel", c: [20.51, -86.95], r: 2 },
  { n: "Tulum", c: [20.21, -87.46], r: 2 },
  { n: "Progreso", c: [21.28, -89.66], r: 2 },
  { n: "Escárcega", c: [18.61, -90.74], r: 2 },
  { n: "Tizimín", c: [21.14, -88.15], r: 2 },
  { n: "F. Carrillo Puerto", c: [19.58, -88.05], r: 2 },
  { n: "Ticul", c: [20.4, -89.53], r: 2 },
];

export const CAPAS = [
  { id: "base", lb: "Mapa base (oscuro)", on: true },
  { id: "etiquetas", lb: "Etiquetas del mapa", on: true },
  { id: "anillos", lb: "Anillos de rango 150/300/450 km", on: true },
  { id: "sitio", lb: "Sitio del radar", on: true },
  { id: "ciudades", lb: "Ciudades principales", on: true },
  { id: "grid", lb: "Retícula lat/lon", on: true },
  { id: "escala", lb: "Escala de color", on: true },
];

export const VELOCIDADES = [0.5, 1, 2, 4];

/* Ventanas de tiempo del reproductor. `horas: null` = todos los sondeos en disco. */
export const VENTANAS = [
  { id: "todo", lb: "todos", horas: null },
  { id: "3h", lb: "últimas 3 h", horas: 3 },
  { id: "1h", lb: "última hora", horas: 1 },
];

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
