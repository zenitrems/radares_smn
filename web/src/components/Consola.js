import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import EncabezadoConsola from "./EncabezadoConsola";
import PanelLateral from "./PanelLateral";
import LineaTiempo from "./LineaTiempo";
import Escala from "./Escala";
import {
  CAPAS,
  fechaUtc,
  horaUtc,
  intervaloMediano,
  limiteCatalogo,
  textoAntiguedad,
  minutosDesde,
  ventanaDeFrames,
} from "../lib/radar";

const MapaRadar = dynamic(() => import("./MapaRadar"), { ssr: false });

const MS_ENTRE_SONDEOS = 520; // a velocidad 1×
const MS_PAUSA_FINAL = 1400;
const MS_REFRESCO = 60000;

const capasIniciales = () => Object.fromEntries(CAPAS.map((l) => [l.id, l.on]));

const ultimoDe = (producto) => producto.frames[producto.frames.length - 1]?.t ?? "";
const primerProductoConDatos = (radar) =>
  (radar.products.find((p) => p.frames.length > 0) ?? radar.products[0]).urlName;

/* Arranca en el radar/producto con el sondeo más reciente en disco. */
function seleccionInicial(catalogo) {
  let mejor = null;
  catalogo.radars.forEach((r) =>
    r.products.forEach((p) => {
      if (p.frames.length === 0) return;
      if (!mejor || ultimoDe(p) > mejor.t) mejor = { radar: r, producto: p, t: ultimoDe(p) };
    })
  );
  const radar = mejor?.radar ?? catalogo.radars[0];
  return {
    radarId: radar?.urlName ?? null,
    prodId: mejor?.producto.urlName ?? (radar ? primerProductoConDatos(radar) : null),
    idx: Math.max(0, (mejor?.producto.frames.length ?? 1) - 1),
  };
}

export default function Consola({ catalogo: inicial }) {
  const [inicio] = useState(() => seleccionInicial(inicial));
  const [catalogo, setCatalogo] = useState(inicial);
  const [radarId, setRadarId] = useState(inicio.radarId);
  const [prodId, setProdId] = useState(inicio.prodId);
  const [ventana, setVentana] = useState("1h");
  const [idx, setIdx] = useState(inicio.idx);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [velocidad, setVelocidad] = useState(1);
  const [capas, setCapas] = useState(capasIniciales);
  const [cursor, setCursor] = useState(null);
  const [escala, setEscala] = useState({ px: 80, txt: "—" });
  const [mapaListo, setMapaListo] = useState(false);

  const radar = catalogo.radars.find((r) => r.urlName === radarId) ?? catalogo.radars[0];
  const producto = radar?.products.find((p) => p.urlName === prodId) ?? radar?.products[0];

  const frames = useMemo(
    () => (producto ? ventanaDeFrames(producto.frames, ventana) : []),
    [producto, ventana]
  );

  const sitios = useMemo(
    () => (radar && producto ? [{ id: radar.urlName, radar, producto, frames, idx }] : []),
    [radar, producto, frames, idx]
  );

  const caja = useMemo(() => limiteCatalogo(catalogo), [catalogo]);

  const enVivo = useRef(true);
  const archivo = useRef(null);

  /* Al cambiar el juego de sondeos (producto, ventana o refresco) se conserva
     la posición: el último sondeo si se venía siguiendo en vivo. */
  useEffect(() => {
    setIdx(() => {
      if (frames.length === 0) return 0;
      if (enVivo.current) return frames.length - 1;
      const i = frames.findIndex((f) => f.file === archivo.current);
      return i >= 0 ? i : frames.length - 1;
    });
  }, [frames]);

  useEffect(() => {
    enVivo.current = frames.length === 0 || idx >= frames.length - 1;
    archivo.current = frames[idx]?.file ?? null;
  }, [idx, frames]);

  const irA = useCallback(
    (i) => setIdx((prev) => (frames.length ? Math.max(0, Math.min(frames.length - 1, i)) : prev)),
    [frames.length]
  );

  /* Reproducción, con pausa al llegar al sondeo más reciente. */
  useEffect(() => {
    if (!reproduciendo || frames.length < 2) return undefined;
    const enFin = idx >= frames.length - 1;
    const id = setTimeout(
      () => setIdx(enFin ? 0 : idx + 1),
      (enFin ? MS_PAUSA_FINAL : MS_ENTRE_SONDEOS) / velocidad
    );
    return () => clearTimeout(id);
  }, [reproduciendo, idx, frames.length, velocidad]);

  /* Los sondeos nuevos llegan al disco cada pocos minutos. */
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

  const elegirRadar = (id) => {
    const r = catalogo.radars.find((x) => x.urlName === id);
    if (!r) return;
    enVivo.current = true;
    setRadarId(id);
    setProdId(primerProductoConDatos(r));
    setReproduciendo(false);
  };

  const elegirProducto = (id) => {
    enVivo.current = true;
    setProdId(id);
    setReproduciendo(false);
  };

  if (!radar || !producto) {
    return (
      <div id="app">
        <div id="loading" className="err">
          <div>NO HAY RADARES CONFIGURADOS EN radares.json</div>
        </div>
      </div>
    );
  }

  const actual = frames[idx];
  const ultimo = producto.frames[producto.frames.length - 1] ?? null;
  const intervalo = intervaloMediano(producto.frames);
  const sinDatos = producto.frames.length === 0;

  const lectura =
    cursor ??
    (actual
      ? `<b>${frames.length} sondeos en ventana</b><br>${
          intervalo ? `cadencia ${intervalo.toFixed(0)} min` : ""
        }${mapaListo ? `${intervalo ? " · " : ""}${textoAntiguedad(minutosDesde(actual.t))}` : ""}`
      : "—");

  return (
    <div id="app">
      <EncabezadoConsola
        estaciones={[{ id: radar.estacion, ultimo }]}
        intervalo={intervalo}
        ruta="/"
      />

      <PanelLateral
        radars={catalogo.radars}
        radar={radar}
        producto={producto}
        capas={capas}
        onRadar={elegirRadar}
        onProducto={elegirProducto}
        onCapa={(id, on) => setCapas((c) => ({ ...c, [id]: on }))}
      />

      <main>
        <div id="stage">
          <MapaRadar
            sitios={sitios}
            vista={producto.map.bounds}
            caja={caja}
            capas={capas}
            onCursor={setCursor}
            onEscala={setEscala}
            onListo={() => setMapaListo(true)}
          />

          <div className="ov ov-tl">
            <b>{radar.showName}</b>
            <span>
              {producto.type.toUpperCase()} · {producto.moment} · {producto.range} km
              {producto.elevation !== null ? ` · elev ${producto.elevation.toFixed(1)}°` : ""}
            </span>
          </div>

          <div className="ov ov-tr">
            <div className="stamp">{actual ? `${horaUtc(actual.t)} UTC` : "--:-- UTC"}</div>
            <div>{actual ? fechaUtc(actual.t) : "—"}</div>
            <div>{actual ? actual.file : "—"}</div>
          </div>

          <div className="ov ov-bl">
            <div className="scalebar">
              <div className="bar" style={{ width: `${escala.px}px` }} />
              <span>{escala.txt}</span>
            </div>
          </div>

          <div className="cursor-ro" dangerouslySetInnerHTML={{ __html: lectura }} />

          {capas.escala && <Escala producto={producto} />}

          {(!mapaListo || sinDatos) && (
            <div id="loading" className={sinDatos ? "err" : ""}>
              {sinDatos ? (
                <div>
                  SIN SONDEOS EN {producto.estacion}/{producto.dir ?? "—"}
                </div>
              ) : (
                <>
                  <div>CARGANDO MAPA BASE</div>
                  <div className="bar">
                    <i />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <LineaTiempo
          frames={frames}
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
