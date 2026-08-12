import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { horaUtc, minutosDesde, pad, textoAntiguedad } from "../lib/radar";

/** Umbral de "enlace activo": el SMN publica un sondeo cada ~6-10 min. */
const MIN_ALERTA = 25;
const MIN_CAIDO = 90;

const VISTAS = [
  { ruta: "/", lb: "estación" },
  { ruta: "/mosaico", lb: "mosaico 450" },
];

const clase = (edad) =>
  edad === null ? "warn" : edad < MIN_ALERTA ? "" : edad < MIN_CAIDO ? "warn" : "off";

/**
 * `estaciones`: [{ id, ultimo }] — una sola en la consola por estación, las dos
 * en el mosaico.
 */
export default function EncabezadoConsola({ estaciones, intervalo, ruta }) {
  /* Todo lo que depende de la hora actual se calcula ya montado, para que el
     HTML del servidor y el del cliente coincidan. */
  const [reloj, setReloj] = useState(null);

  /* Se depende del contenido de `estaciones`, no de su identidad, para no
     reiniciar el intervalo en cada render del padre. */
  const ref = useRef(estaciones);
  ref.current = estaciones;
  const clave = estaciones.map((e) => `${e.id}:${e.ultimo?.t ?? ""}`).join("|");

  useEffect(() => {
    const tic = () => {
      const d = new Date();
      setReloj({
        utc: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`,
        loc: d.toLocaleTimeString("es-MX", { hour12: false, timeZone: "America/Mexico_City" }),
        edades: ref.current.map((e) => (e.ultimo ? minutosDesde(e.ultimo.t) : Infinity)),
      });
    };
    tic();
    const id = setInterval(tic, 1000);
    return () => clearInterval(id);
  }, [clave]);

  const edadDe = (i) => (reloj && reloj.edades[i] !== undefined ? reloj.edades[i] : null);
  const peor = reloj ? Math.max(...reloj.edades) : null;
  const textoEnlace =
    peor === null
      ? "verificando"
      : peor < MIN_ALERTA
      ? "activo"
      : peor < MIN_CAIDO
      ? "con retraso"
      : "sin datos nuevos";

  const varias = estaciones.length > 1;

  return (
    <header>
      <div className="brand">
        <b>Sondeos Radar</b>
        <span>SMN · PENÍNSULA DE YUCATÁN</span>
      </div>
      <div className="hdr-sep" />

      <div className="seg nav">
        {VISTAS.map((v) => (
          <Link key={v.ruta} href={v.ruta} aria-pressed={v.ruta === ruta}>
            {v.lb}
          </Link>
        ))}
      </div>

      <div className="hdr-sep" />
      <div className="hdr-item">
        <i className={`led ${clase(peor)}`} />
        Enlace <b>{textoEnlace}</b>
      </div>

      {estaciones.map((e, i) => (
        <div className="hdr-item" key={e.id}>
          {varias ? <i className={`led ${clase(edadDe(i))}`} /> : null}
          {varias ? e.id : "Último sondeo"} <b>{e.ultimo ? `${horaUtc(e.ultimo.t)}Z` : "—"}</b>
          {edadDe(i) !== null && e.ultimo ? (
            <span className="hdr-sub">{textoAntiguedad(edadDe(i))}</span>
          ) : null}
        </div>
      ))}

      {!varias && intervalo ? (
        <div className="hdr-item">
          Cadencia <b>{intervalo.toFixed(0)} min</b>
        </div>
      ) : null}

      <div className="spacer" />
      <div className="clock">
        <span>{reloj ? reloj.utc : "--:--:--"}</span>
        <i>UTC</i>
      </div>
      <div className="hdr-sep" />
      <div className="clock">
        <span>{reloj ? reloj.loc : "--:--:--"}</span>
        <i>CST</i>
      </div>
    </header>
  );
}
