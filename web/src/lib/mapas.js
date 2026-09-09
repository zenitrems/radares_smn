/**
 * Catálogo de mapas base.
 */

const TOKEN_MAPBOX = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

/**
 * Teselas rasterizadas de un estilo de Mapbox. `estilo` es la parte del
 * `mapbox://styles/…` que sigue al esquema: 'mapbox/satellite-v9' para los
 * estilos de casa, 'usuario/id' para uno propio.
 *
 * Se piden de 512 y a @2x: `tileSize` dice cuánto mapa cubre cada tesela y
 * `tilePixelRatio` cuántos píxeles de imagen trae, que es como OpenLayers
 * describe una tesela retina.
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
    tilePixelRatio: 2,
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
    tilePixelRatio: 2,
    maxZoom: 20,
    opacity: 0.72,
    token: "mapbox",
  },
];

export const MAPA_INICIAL = "mapbox-oscuro";

const TOKENS = { mapbox: TOKEN_MAPBOX };

/** Un mapa está disponible si no necesita credencial o si la credencial existe. */
export const disponible = (mapa) => !mapa.token || Boolean(TOKENS[mapa.token]);

export const mapaPorId = (id) => MAPAS.find((m) => m.id === id) ?? MAPAS[0];
