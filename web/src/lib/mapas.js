/**
 * Catálogo de mapas base.
 *
 * La consola nació sin mapa base —sólo los vectores del INEGI— y esa sigue
 * siendo la opción por omisión: no depende de ningún servicio externo y nada
 * compite con los ecos. El satélite se añade como alternativa para reconocer
 * terreno, costa y manchas urbanas bajo la lluvia.
 *
 * Para agregar otro basta una entrada más: `url` con las plantillas de Leaflet
 * y, si el proveedor lo pide, `tileSize`/`zoomOffset` (Mapbox sirve teselas de
 * 512 px, que en Leaflet equivalen a un nivel de zoom menos).
 */

/* Inline en el bundle al construir: por eso el prefijo NEXT_PUBLIC_. */
const TOKEN_MAPBOX = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

/**
 * Teselas rasterizadas de un estilo de Mapbox. `estilo` es la parte del
 * `mapbox://styles/…` que sigue al esquema: 'mapbox/satellite-v9' para los
 * estilos de casa, 'usuario/id' para uno propio.
 */
const mapbox = (estilo) =>
  `https://api.mapbox.com/styles/v1/${estilo}/tiles/512/{z}/{x}/{y}@2x?access_token=${TOKEN_MAPBOX}`;

const ATRIB_MAPBOX =
  '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export const MAPAS = [
  {
    id: "ninguno",
    lb: "Ninguno",
    nota: "sólo vectores INEGI",
    url: null,
  },
  {
    id: "mapbox-oscuro",
    lb: "Oscuro",
    nota: "Mapbox · zenlab",
    url: mapbox("zenlab/cmtplnn6b007501qrfroxgtbu"),
    attribution: ATRIB_MAPBOX,
    tileSize: 512,
    zoomOffset: -1,
    maxZoom: 20,
    token: "mapbox",
  },
  {
    id: "mapbox-satelite",
    lb: "Satélite",
    nota: "Mapbox",
    url: mapbox("mapbox/satellite-v9"),
    attribution: ATRIB_MAPBOX,
    tileSize: 512,
    zoomOffset: -1,
    maxZoom: 20,
    opacity: 0.72,
    token: "mapbox",
  },
];

export const MAPA_INICIAL = "ninguno";

const TOKENS = { mapbox: TOKEN_MAPBOX };

/** Un mapa está disponible si no necesita credencial o si la credencial existe. */
export const disponible = (mapa) => !mapa.token || Boolean(TOKENS[mapa.token]);

export const mapaPorId = (id) => MAPAS.find((m) => m.id === id) ?? MAPAS[0];
