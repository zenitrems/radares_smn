import { CAPAS, horaUtc } from "../lib/radar";

export default function PanelLateral({
  radars,
  radar,
  producto,
  capas,
  onRadar,
  onProducto,
  onCapa,
}) {
  return (
    <aside>
      <div className="sec">
        <div className="sec-h">
          Radar <em>{radars.length} activos</em>
        </div>
        <div className="sec-b">
          {radars.map((r) => (
            <button
              key={r.urlName}
              className="radar"
              aria-selected={r.urlName === radar.urlName}
              onClick={() => onRadar(r.urlName)}
            >
              <i className="dot" />
              <div className="nm">{r.showName}</div>
              <div className="tag">{r.radarBrand}</div>
              <div className="meta">
                {r.markerCenter[0].toFixed(3)}°N {Math.abs(r.markerCenter[1]).toFixed(3)}°W ·{" "}
                {r.products.length} prod.
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="sec">
        <div className="sec-h">Producto</div>
        <div className="sec-b">
          {radar.products.map((p) => (
            <button
              key={p.urlName}
              className="prod"
              aria-selected={p.urlName === producto.urlName}
              disabled={p.frames.length === 0}
              onClick={() => onProducto(p.urlName)}
            >
              <div className="r1">
                <span className="t">
                  {p.type.toUpperCase()} · {p.moment}
                </span>
                <span className="k">{p.filter}</span>
              </div>
              <div className="r2">
                <span>rango {p.range} km</span>
                {p.elevation !== null && <span>elev {p.elevation.toFixed(1)}°</span>}
                {p.thresholds && <span>{p.thresholds}</span>}
                {p.frames.length > 0 ? (
                  <span>
                    {p.frames.length} sondeos · {horaUtc(p.frames[p.frames.length - 1].t)}Z
                  </span>
                ) : (
                  <span className="vacio">sin sondeos en disco</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="sec">
        <div className="sec-h">Capas</div>
        <div className="sec-b">
          {CAPAS.map((l) => (
            <label className="lyr" key={l.id}>
              <input
                type="checkbox"
                checked={!!capas[l.id]}
                onChange={(e) => onCapa(l.id, e.target.checked)}
              />
              <i className="box" />
              <span className="lb">{l.lb}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="sec">
        <div className="sec-h">Sitio</div>
        <dl className="kv">
          <dt>Estación</dt>
          <dd>{radar.estacion}</dd>
          <dt>Fuente</dt>
          <dd>{radar.source.toUpperCase()}</dd>
          <dt>Marca</dt>
          <dd>{radar.radarBrand}</dd>
          <dt>Latitud</dt>
          <dd>{radar.markerCenter[0].toFixed(6)}</dd>
          <dt>Longitud</dt>
          <dd>{radar.markerCenter[1].toFixed(6)}</dd>
          <dt>Directorio</dt>
          <dd>{producto.dir ?? "—"}</dd>
          <dt>Estado</dt>
          <dd style={{ color: radar.maintenance ? "var(--warn)" : "var(--teal)" }}>
            {radar.maintenance ? "mantenimiento" : "operativo"}
          </dd>
        </dl>
      </div>
    </aside>
  );
}
