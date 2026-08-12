import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import EncabezadoConsola from "./EncabezadoConsola";
import PanelMosaico from "./PanelMosaico";
import LineaTiempo from "./LineaTiempo";
import Escala from "./Escala";
import {
  CAPAS,
  fechaUtc,
  horaUtc,
  limiteCatalogo,
  textoAntiguedad,
  minutosDesde,
  unirLimites,
  VENTANAS,
} from "../lib/radar";
import {
  construirPasos,
  estacionesDelMosaico,
  PRODUCTO_MOSAICO,
  ventanaDePasos,
} from "../lib/mosaico";

const MapaRadar = dynamic(() => import("./MapaRadar"), { ssr: false });

const MS_ENTRE_SONDEOS = 520; // a velocidad 1×
const MS_PAUSA_FINAL = 1400;
const MS_REFRESCO = 60000;

const capasIniciales = () => Object.fromEntries(CAPAS.map((l) => [l.id, l.on]));

/* Por omisión se muestra la última hora: si una estación lleva días sin
   publicar, "todos" estiraría el eje sobre un hueco enorme. */
const VENTANA_INICIAL = "1h";

export default function ConsolaMosaico({ catalogo: inicial }) {
  const [catalogo, setCatalogo] = useState(inicial);
  const [ventana, setVentana] = useState(VENTANA_INICIAL);
  const [visibles, setVisibles] = useState({});
  const [reproduciendo, setReproduciendo] = useState(false);
  const [velocidad, setVelocidad] = useState(1);
  const [capas, setCapas] = useState(capasIniciales);
  const [cursor, setCursor] = useState(null);
  const [escala, setEscala] = useState({ px: 80, txt: "—" });
  const [mapaListo, setMapaListo] = useState(false);

  const estaciones = useMemo(
    () => estacionesDelMosaico(catalogo).map((e, orden) => ({ ...e, orden })),
    [catalogo]
  );

  const todosLosPasos = useMemo(() => construirPasos(estaciones), [estaciones]);
  const pasos = useMemo(
    () => ventanaDePasos(todosLosPasos, VENTANAS.find((v) => v.id === ventana)?.horas),
    [todosLosPasos, ventana]
  );

  /* Arranca en el paso más reciente y ahí se queda mientras entren sondeos. */
  const [idx, setIdx] = useState(() => Math.max(0, pasos.length - 1));
  const enVivo = useRef(true);
  const sello = useRef(null);

  useEffect(() => {
    setIdx(() => {
      if (pasos.length === 0) return 0;
      if (enVivo.current) return pasos.length - 1;
      const i = pasos.findIndex((p) => p.t === sello.current);
      return i >= 0 ? i : pasos.length - 1;
    });
  }, [pasos]);

  useEffect(() => {
    enVivo.current = pasos.length === 0 || idx >= pasos.length - 1;
    sello.current = pasos[idx]?.t ?? null;
  }, [idx, pasos]);

  const irA = useCallback(
    (i) => setIdx((prev) => (pasos.length ? Math.max(0, Math.min(pasos.length - 1, i)) : prev)),
    [pasos.length]
  );

  useEffect(() => {
    if (!reproduciendo || pasos.length < 2) return undefined;
    const enFin = idx >= pasos.length - 1;
    const id = setTimeout(
      () => setIdx(enFin ? 0 : idx + 1),
      (enFin ? MS_PAUSA_FINAL : MS_ENTRE_SONDEOS) / velocidad
    );
    return () => clearTimeout(id);
  }, [reproduciendo, idx, pasos.length, velocidad]);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const r = await fetch("/api/sondeos");
        if (r.ok) setCatalogo(await r.json());
      } catch {
        /* si falla el refresco se conserva el catálogo anterior */
      }
    }, MS_REFRESCO);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      const enRango = e.target instanceof HTMLInputElement;
      if (e.key === "ArrowLeft" && !enRango) {
        setReproduciendo(false);
        irA(idx - 1);
        e.preventDefault();
      } else if (e.key === "ArrowRight" && !enRango) {
        setReproduciendo(false);
        irA(idx + 1);
        e.preventDefault();
      } else if (e.code === "Space") {
        setReproduciendo((p) => !p);
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, irA]);

  const paso = pasos[idx];

  const sitios = useMemo(
    () =>
      estaciones.map((e) => ({
        id: e.id,
        radar: e.radar,
        producto: e.producto,
        frames: e.frames,
        idx: paso ? paso.idx[e.orden] : -1,
        visible: visibles[e.id] !== false,
      })),
    [estaciones, paso, visibles]
  );

  const vista = useMemo(
    () => unirLimites(estaciones.map((e) => e.producto.map.bounds)),
    [estaciones]
  );

  const caja = useMemo(() => limiteCatalogo(catalogo), [catalogo]);

  const cabecera = useMemo(
    () => estaciones.map((e) => ({ id: e.id, ultimo: e.frames[e.frames.length - 1] ?? null })),
    [estaciones]
  );

  if (estaciones.length === 0) {
    return (
      <div id="app">
        <div id="loading" className="err">
          <div>NO HAY SONDEOS DE {PRODUCTO_MOSAICO} KM EN DISCO PARA NINGUNA ESTACIÓN</div>
        </div>
      </div>
    );
  }

  const conEco = sitios.filter((s) => s.visible && s.idx >= 0).length;
  const lectura =
    cursor ??
    (paso
      ? `<b>${conEco} de ${estaciones.length} estaciones</b><br>${pasos.length} pasos${
          mapaListo ? ` · ${textoAntiguedad(minutosDesde(paso.t))}` : ""
        }`
      : "—");

  return (
    <div id="app">
      <EncabezadoConsola estaciones={cabecera} ruta="/mosaico" />

      <PanelMosaico
        estaciones={estaciones}
        visibles={visibles}
        pasos={pasos}
        capas={capas}
        onVisible={(id, on) => setVisibles((v) => ({ ...v, [id]: on }))}
        onCapa={(id, on) => setCapas((c) => ({ ...c, [id]: on }))}
      />

      <main>
        <div id="stage">
          <MapaRadar
            sitios={sitios}
            vista={vista}
            caja={caja}
            capas={capas}
            onCursor={setCursor}
            onEscala={setEscala}
            onListo={() => setMapaListo(true)}
          />

          <div className="ov ov-tl">
            <b>Mosaico {PRODUCTO_MOSAICO} km</b>
            <span>
              {estaciones[0].producto.type.toUpperCase()} · {estaciones[0].producto.moment} ·{" "}
              {estaciones.map((e) => e.id).join(" + ")}
            </span>
          </div>

          <div className="ov ov-tr">
            <div className="stamp">{paso ? `${horaUtc(paso.t)} UTC` : "--:-- UTC"}</div>
            <div>{paso ? fechaUtc(paso.t) : "—"}</div>
            {estaciones.map((e) => {
              const i = paso ? paso.idx[e.orden] : -1;
              const f = i >= 0 ? e.frames[i] : null;
              const desfase = f ? Math.round((new Date(f.t) - new Date(paso.t)) / 60000) : null;
              return (
                <div key={e.id} className={f ? "" : "ausente"}>
                  {e.id} {f ? `${horaUtc(f.t)}Z` : "sin sondeo"}
                  {f && desfase !== 0 ? ` (${desfase > 0 ? "+" : ""}${desfase} min)` : ""}
                </div>
              );
            })}
          </div>

          <div className="ov ov-bl">
            <div className="scalebar">
              <div className="bar" style={{ width: `${escala.px}px` }} />
              <span>{escala.txt}</span>
            </div>
          </div>

          <div className="cursor-ro" dangerouslySetInnerHTML={{ __html: lectura }} />

          {capas.escala && <Escala producto={estaciones[0].producto} />}

          {!mapaListo && (
            <div id="loading">
              <div>CARGANDO MAPA BASE</div>
              <div className="bar">
                <i />
              </div>
            </div>
          )}
        </div>

        <LineaTiempo
          frames={pasos}
          idx={idx}
          reproduciendo={reproduciendo}
          velocidad={velocidad}
          ventana={ventana}
          onIdx={(i) => {
            setReproduciendo(false);
            irA(i);
          }}
          onReproducir={setReproduciendo}
          onVelocidad={setVelocidad}
          onVentana={setVentana}
        />
      </main>
    </div>
  );
}
