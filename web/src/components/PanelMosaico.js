import SelectorCapas from "./SelectorCapas";
import { horaUtc } from "../lib/radar";
import { TOLERANCIA_MIN } from "../lib/mosaico";

export default function PanelMosaico({
  estaciones,
  visibles,
  pasos,
  capas,
  mapaBase,
  onVisible,
  onCapa,
  onMapaBase,
}) {
  return (
    <aside>
      <div className="sec">
        <div className="sec-h">
          Estaciones <em>{estaciones.length} combinadas</em>
        </div>
        <div className="sec-b">
          {estaciones.map((e) => (
            <label className="radar" key={e.id} aria-selected={visibles[e.id] !== false}>
              <input
                type="checkbox"
                className="oculto"
                checked={visibles[e.id] !== false}
                onChange={(ev) => onVisible(e.id, ev.target.checked)}
              />
              <i className="dot" />
              <div className="nm">{e.radar.showName}</div>
              <div className="tag">{e.id}</div>
              <div className="meta">
                {e.frames.length} sondeos · último {horaUtc(e.frames[e.frames.length - 1].t)}Z
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="sec">
        <div className="sec-h">Producto</div>
        <div className="sec-b">
          {estaciones.map((e) => (
            <div className="prod" key={e.id} aria-selected="true">
              <div className="r1">
                <span className="t">
                  {e.producto.type.toUpperCase()} · {e.producto.moment}
                </span>
                <span className="k">{e.producto.filter}</span>
              </div>
              <div className="r2">
                <span>rango {e.producto.range} km</span>
                {e.producto.elevation !== null && (
                  <span>elev {e.producto.elevation.toFixed(1)}°</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <SelectorCapas
        mapaBase={mapaBase}
        capas={capas}
        onMapaBase={onMapaBase}
        onCapa={onCapa}
      />

      <div className="sec">
        <div className="sec-h">Emparejado</div>
        <dl className="kv">
          <dt>Pasos</dt>
          <dd>{pasos.length}</dd>
          <dt>Tolerancia</dt>
          <dd>± {TOLERANCIA_MIN} min</dd>
          {estaciones.map((e) => (
            <FilaCobertura key={e.id} estacion={e} pasos={pasos} />
          ))}
        </dl>
      </div>
    </aside>
  );
}

/* Cuántos pasos del eje alcanza a cubrir cada estación. */
function FilaCobertura({ estacion, pasos }) {
  const i = estacion.orden;
  const cubiertos = pasos.filter((p) => p.idx[i] >= 0).length;
  const todos = cubiertos === pasos.length && pasos.length > 0;
  return (
    <>
      <dt>{estacion.id}</dt>
      <dd style={{ color: cubiertos === 0 ? "var(--danger)" : todos ? "var(--teal)" : "var(--txt)" }}>
        {cubiertos}/{pasos.length} pasos
      </dd>
    </>
  );
}
