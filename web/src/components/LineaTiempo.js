import { useMemo } from "react";
import { pad, VELOCIDADES, VENTANAS } from "../lib/radar";

/* Marcas horarias, sin encimarlas (misma regla del diseño). */
function marcas(frames) {
  const n = frames.length;
  if (n < 2) return [];
  const candidatas = [];
  frames.forEach((f, i) => {
    const enHora = new Date(f.t).getUTCMinutes() === 0;
    if (enHora || i === 0 || i === n - 1) candidatas.push({ i, f, hora: enHora });
  });
  const puestas = [];
  const salida = [];
  candidatas
    .slice()
    .sort((a, b) => (b.hora ? 1 : 0) - (a.hora ? 1 : 0))
    .forEach((m) => {
      const pct = (m.i / (n - 1)) * 100;
      if (puestas.some((p) => Math.abs(p - pct) < 7)) return;
      puestas.push(pct);
      const d = new Date(m.f.t);
      salida.push({ pct, txt: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}` });
    });
  return salida;
}

export default function LineaTiempo({
  frames,
  idx,
  reproduciendo,
  velocidad,
  ventana,
  onIdx,
  onReproducir,
  onVelocidad,
  onVentana,
}) {
  const n = frames.length;
  const tks = useMemo(() => marcas(frames), [frames]);
  const pct = n > 1 ? (idx / (n - 1)) * 100 : 100;
  const vacio = n === 0;

  return (
    <div id="tl">
      <div className="tbtns">
        <button className="tb" title="Primer sondeo" disabled={vacio} onClick={() => onIdx(0)}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M2 1h1.6v10H2zM11 1v10L4.5 6z" />
          </svg>
        </button>
        <button
          className="tb"
          title="Sondeo anterior (←)"
          disabled={vacio}
          onClick={() => onIdx(idx - 1)}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M9.5 1v10L3 6z" />
          </svg>
        </button>
        <button
          className="tb play"
          title={reproduciendo ? "Pausar (espacio)" : "Reproducir (espacio)"}
          disabled={n < 2}
          onClick={() => onReproducir(!reproduciendo)}
        >
          <svg width="13" height="13" viewBox="0 0 12 12" fill="currentColor">
            <path d={reproduciendo ? "M2.5 1h3v10h-3zM6.5 1h3v10h-3z" : "M2.5 1l8 5-8 5z"} />
          </svg>
        </button>
        <button
          className="tb"
          title="Sondeo siguiente (→)"
          disabled={vacio}
          onClick={() => onIdx(idx + 1)}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M2.5 1v10L9 6z" />
          </svg>
        </button>
        <button className="tb" title="Último sondeo" disabled={vacio} onClick={() => onIdx(n - 1)}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M8.4 1H10v10H8.4zM1 1l6.5 5L1 11z" />
          </svg>
        </button>
        <div style={{ width: 8 }} />
        <span className="tl-lbl">VEL</span>
        <div className="seg">
          {VELOCIDADES.map((s) => (
            <button
              key={s}
              aria-pressed={s === velocidad}
              onClick={() => onVelocidad(s)}
            >{`${s}×`}</button>
          ))}
        </div>
      </div>

      <div className="track-wrap">
        <div id="ticks">
          {tks.map((t) => (
            <div className="tk" key={t.pct} style={{ left: `${t.pct}%` }}>
              <b>{t.txt}</b>
              <span />
            </div>
          ))}
        </div>
        <input
          id="range"
          type="range"
          min={0}
          max={Math.max(0, n - 1)}
          step={1}
          value={idx}
          disabled={vacio}
          onChange={(e) => onIdx(Number(e.target.value))}
          style={{ "--pct": `${pct}%` }}
          aria-label="Sondeo"
        />
      </div>

      <div className="tl-right">
        <div className="tl-count">
          Sondeo <b>{vacio ? "—" : idx + 1}</b> / <span>{vacio ? "—" : n}</span>
        </div>
        <div className="seg">
          {VENTANAS.map((v) => (
            <button key={v.id} aria-pressed={v.id === ventana} onClick={() => onVentana(v.id)}>
              {v.lb}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
