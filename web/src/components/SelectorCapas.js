/**
 * Selección de qué se ve en el mapa, en dos registros distintos:
 *
 *   - el mapa base es una elección entre opciones excluyentes (radio),
 *   - las capas se encienden y apagan por separado (casillas), agrupadas en
 *     geografía e instrumentación del radar.
 *
 * Ambas listas salen de un catálogo (lib/mapas y lib/radar), así que añadir un
 * proveedor de teselas o una capa nueva no toca este componente.
 */
import { disponible, MAPAS } from "../lib/mapas";
import { GRUPOS_CAPAS } from "../lib/radar";

export default function SelectorCapas({ mapaBase, capas, onMapaBase, onCapa }) {
  return (
    <>
      <div className="sec">
        <div className="sec-h">Mapa base</div>
        <div className="sec-b">
          {MAPAS.map((m) => {
            const hay = disponible(m);
            return (
              <label className="lyr op" key={m.id} aria-disabled={!hay}>
                <input
                  type="radio"
                  name="mapa-base"
                  checked={mapaBase === m.id}
                  disabled={!hay}
                  onChange={() => onMapaBase(m.id)}
                />
                <i className="radio" />
                <span className="lb">{m.lb}</span>
                <span className="nota">{hay ? m.nota : "falta credencial"}</span>
              </label>
            );
          })}
        </div>
      </div>

      {GRUPOS_CAPAS.map((g) => (
        <div className="sec" key={g.id}>
          <div className="sec-h">{g.lb}</div>
          <div className="sec-b">
            {g.capas.map((l) => (
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
      ))}
    </>
  );
}
