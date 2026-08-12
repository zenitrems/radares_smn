import { useEffect, useState } from "react";
import { horaUtc, minutosDesde, pad, textoAntiguedad } from "../lib/radar";

/** Umbral de "enlace activo": el SMN publica un sondeo cada ~6-10 min. */
const MIN_ALERTA = 25;
const MIN_CAIDO = 90;

export default function EncabezadoConsola({ ultimo, intervalo }) {
  /* Todo lo que depende de la hora actual se calcula ya montado, para que el
     HTML del servidor y el del cliente coincidan. */
  const [reloj, setReloj] = useState(null);

  useEffect(() => {
    const tic = () => {
      const d = new Date();
      setReloj({
        utc: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`,
        loc: d.toLocaleTimeString("es-MX", { hour12: false, timeZone: "America/Mexico_City" }),
        edad: ultimo ? minutosDesde(ultimo.t) : Infinity,
      });
    };
    tic();
    const id = setInterval(tic, 1000);
    return () => clearInterval(id);
  }, [ultimo]);

  const edad = reloj ? reloj.edad : null;
  const estado = edad === null ? "warn" : edad < MIN_ALERTA ? "" : edad < MIN_CAIDO ? "warn" : "off";
  const textoEnlace =
    edad === null
      ? "verificando"
      : edad < MIN_ALERTA
      ? "activo"
      : edad < MIN_CAIDO
      ? "con retraso"
      : "sin datos nuevos";

  return (
    <header>
      <div className="brand">
        <b>Sondeos Radar</b>
        <span>SMN · PENÍNSULA DE YUCATÁN</span>
      </div>
      <div className="hdr-sep" />
      <div className="hdr-item">
        <i className={`led ${estado}`} />
        Enlace <b>{textoEnlace}</b>
      </div>
      <div className="hdr-item">
        Último sondeo <b>{ultimo ? `${horaUtc(ultimo.t)}Z` : "—"}</b>
      </div>
      <div className="hdr-item">
        Latencia <b>{ultimo && edad !== null ? textoAntiguedad(edad).replace("hace ", "") : "—"}</b>
      </div>
      {intervalo ? (
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
