/**
 * Escenario de la consola: los GIF de sondeo colocados sobre sus `bounds`
 * reales (los sondeos del SMN son PNG/GIF transparentes georreferenciados, no
 * imágenes planas), más las capas vectoriales del diseño.
 *
 * El mapa es un `ol/Map` creado una sola vez; lo que cambia con las props se
 * sincroniza en efectos. Las capas se declaran como hijos —cada una da de alta
 * la suya y no pinta DOM— para que este archivo siga siendo la lista de lo que
 * hay en el escenario.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import Map from "ol/Map";
import View from "ol/View";
import Control from "ol/control/Control";
import { defaults as controlesPorDefecto } from "ol/control/defaults";
import { getPointResolution, toLonLat } from "ol/proj";
import CapaAeropuertos from "./CapaAeropuertos";
import CapaBase from "./CapaBase";
import CapaCosta from "./CapaCosta";
import CapaEcos from "./CapaEcos";
import CapaLocalidades from "./CapaLocalidades";
import CapaMunicipios from "./CapaMunicipios";
import { CapaAnillos, CapaReticula, CapaSitios } from "./CapaInstrumento";
import { ProveedorMapa } from "../mapa/contexto";
import { aVista, extentDe, VISTA } from "../mapa/geo";
import { rumbo } from "../lib/radar";

const ESCALAS_KM = [1, 2, 5, 10, 20, 25, 50, 100, 150, 200, 250, 500, 1000];

const MARGEN = [8, 8, 8, 8]; // el aire que deja `fit` alrededor del encuadre

/* Referencia estable: un {} literal por defecto remontaría la capa municipal
   en cada render del mapa. */
const VACIO = {};

const centroDe = (bounds) =>
  aVista([(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2]);

/**
 * La vista lleva el límite geográfico del escenario: por ahora no hace falta
 * poder alejarse hasta ver el planeta, sólo la península y el alcance de los
 * radares. `showFullExtent` hace de mínimo de zoom (el encuadre no puede
 * quedarse más pequeño que la caja) y el constraint sin suavizar es el
 * equivalente al `maxBoundsViscosity: 1` de antes: no hay goma al llegar al
 * borde. El extent de una vista no se puede cambiar, así que si cambia la caja
 * se construye otra conservando dónde estaba mirando el usuario.
 */
function crearVista(caja, centro, resolucion) {
  const vista = new View({
    projection: VISTA,
    center: centro,
    zoom: 7,
    enableRotation: false,
    smoothExtentConstraint: false,
    showFullExtent: Boolean(caja),
    extent: caja ? extentDe(caja) : undefined,
  });
  if (resolucion) vista.setResolution(resolucion);
  return vista;
}

/* Botón para volver a encuadrar el sitio actual sin esperar a que cambie el
   producto: útil después de que el usuario haya paneado o hecho zoom a mano. */
class BotonCentrar extends Control {
  constructor(alPulsar) {
    const caja = document.createElement("div");
    caja.className = "ol-centrar ol-unselectable ol-control";
    const boton = document.createElement("button");
    boton.type = "button";
    boton.title = "Centrar en el radar";
    boton.setAttribute("aria-label", "Centrar en el radar");
    boton.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8" cy="8" r="3.2"/><path d="M8 1v2.6M8 12.4V15M1 8h2.6M12.4 8H15"/></svg>';
    caja.appendChild(boton);
    super({ element: caja });
    boton.addEventListener("click", alPulsar);
  }
}

/* Lectura de cursor (respecto al sitio más cercano) y barra de escala. */
function useSensor(mapa, sitios, onCursor, onEscala) {
  /* Los manejadores se registran una vez y leen de aquí: `sitios` cambia con
     cada sondeo y volver a suscribirse en cada uno sería tirar el trabajo. */
  const ref = useRef();
  ref.current = { sitios, onCursor, onEscala };

  useEffect(() => {
    if (!mapa) return undefined;
    const vista = () => mapa.getView();

    const medir = () => {
      const resolucion = vista().getResolution();
      const centro = vista().getCenter();
      if (!resolucion || !centro) return;
      /* En Mercator un píxel vale más metros cuanto más al norte: la escala se
         mide en el centro del encuadre, que es donde mira el usuario. */
      const kmPor100px =
        (getPointResolution(vista().getProjection(), resolucion, centro) * 100) / 1000;
      if (!kmPor100px) return;
      const km = [...ESCALAS_KM].reverse().find((v) => v <= kmPor100px) ?? ESCALAS_KM[0];
      ref.current.onEscala({ px: Math.round((100 * km) / kmPor100px), txt: `${km} km` });
    };

    const enMover = (e) => {
      const [lon, lat] = toLonLat(e.coordinate, VISTA);
      const cerca = ref.current.sitios
        .map((s) => ({ s, ...rumbo(s.radar.markerCenter, [lat, lon]) }))
        .sort((a, b) => a.km - b.km)[0];
      if (!cerca) return;
      const sitio = ref.current.sitios.length > 1 ? `${cerca.s.radar.estacion} · ` : "";
      ref.current.onCursor(
        `<b>${lat.toFixed(3)}°N ${Math.abs(lon).toFixed(3)}°W</b><br>${sitio}${cerca.km.toFixed(
          0
        )} km · ${cerca.az.toFixed(0)}° del sitio`
      );
    };

    const enSalir = () => ref.current.onCursor(null);

    medir();
    mapa.on("moveend", medir);
    mapa.on("change:size", medir);
    mapa.on("pointermove", enMover);
    mapa.getViewport().addEventListener("pointerleave", enSalir);
    return () => {
      mapa.un("moveend", medir);
      mapa.un("change:size", medir);
      mapa.un("pointermove", enMover);
      mapa.getViewport().removeEventListener("pointerleave", enSalir);
    };
  }, [mapa]);
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
  const contenedor = useRef(null);
  const [mapa, setMapa] = useState(null);

  /* Lo que necesitan el constructor del mapa y el botón de centrar sin ser
     dependencias suyas: el mapa se crea una vez y el botón vive con él. */
  const inicial = useRef({ caja, vista });
  const encuadre = useRef(vista);
  encuadre.current = vista;
  const alListo = useRef(onListo);
  alListo.current = onListo;

  useEffect(() => {
    const m = new Map({
      target: contenedor.current,
      layers: [],
      view: crearVista(inicial.current.caja, centroDe(inicial.current.vista)),
      controls: controlesPorDefecto({
        rotate: false,
        attributionOptions: { collapsible: false },
      }).extend([
        new BotonCentrar(() =>
          m.getView().fit(extentDe(encuadre.current), { padding: MARGEN, duration: 260 })
        ),
      ]),
    });

    m.once("rendercomplete", () => alListo.current && alListo.current());
    /* Los rótulos se pintan en el lienzo: hasta que no está la IBM Plex se
       dibujan con la letra de reserva y hay que repintarlos. */
    let vivo = true;
    document.fonts?.ready.then(() => vivo && m.render());

    setMapa(m);
    return () => {
      vivo = false;
      m.setTarget(undefined);
      m.dispose();
    };
  }, []);

  /* La caja sale del catálogo y en la práctica no cambia, pero el refresco de
     cada minuto trae objetos nuevos: se compara por valor. */
  const claveCaja = JSON.stringify(caja);
  const cajaPuesta = useRef(claveCaja);
  useEffect(() => {
    if (!mapa || cajaPuesta.current === claveCaja) return;
    cajaPuesta.current = claveCaja;
    const previa = mapa.getView();
    mapa.setView(crearVista(caja, previa.getCenter(), previa.getResolution()));
  }, [mapa, caja, claveCaja]);

  /* Reencuadra al cambiar de producto, de radar o de vista — pero no en cada
     refresco del catálogo: este llega cada minuto con objetos `bounds` nuevos
     aunque valgan lo mismo, y si se comparase por referencia se perdería el
     zoom/posición que el usuario haya elegido a mano. */
  const claveVista = JSON.stringify(vista);
  const vistaPuesta = useRef(null);
  useEffect(() => {
    if (!mapa || vistaPuesta.current === claveVista) return;
    vistaPuesta.current = claveVista;
    mapa.getView().fit(extentDe(vista), { padding: MARGEN });
  }, [mapa, vista, claveVista]);

  useSensor(mapa, sitios, onCursor, onEscala);

  /* La geometría solo depende de qué sitios y productos hay, no del sondeo en
     pantalla: se aísla del `idx` para que la reproducción no la redibuje. */
  const clave = sitios.map((s) => `${s.id}:${s.producto.urlName}`).join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const geo = useMemo(
    () => sitios.map(({ id, radar, producto }) => ({ id, radar, producto })),
    [clave]
  );
  const rangoMax = Math.max(...geo.map((s) => s.producto.range), 300);

  return (
    <div ref={contenedor} className="mapa">
      {mapa && (
        <ProveedorMapa value={mapa}>
          <CapaBase id={mapaBase} />

          {sitios.map((s) => (s.visible === false ? null : <CapaEcos key={s.id} sitio={s} />))}

          {capas.costa && <CapaCosta />}
          {capas.municipios && <CapaMunicipios lluvia={lluvia} onMunicipio={onMunicipio} />}

          {capas.grid && <CapaReticula bounds={vista} paso={rangoMax >= 450 ? 2 : 1} />}
          {capas.anillos && <CapaAnillos sitios={geo} />}
          {capas.localidades && <CapaLocalidades />}
          {capas.aeropuertos && <CapaAeropuertos />}
          {capas.sitio && <CapaSitios sitios={geo} />}
        </ProveedorMapa>
      )}
    </div>
  );
}
