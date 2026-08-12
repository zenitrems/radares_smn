import { escalaDe } from "../lib/escalas";

export default function Escala({ producto }) {
  const { pasos, unidad } = escalaDe(producto);
  return (
    <div id="legend">
      <div className="ttl">{unidad}</div>
      <div className="ramp">
        {pasos.map(([t, c], i) => (
          <div className="stp" key={t}>
            <div className="sw" style={{ background: c }} />
            {i % 2 === 0 && <i>{t}</i>}
          </div>
        ))}
      </div>
    </div>
  );
}
