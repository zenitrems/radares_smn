// src/components/GifSlider.js
import React, { useState, useEffect } from "react";

export default function GifSlider({ contexts }) {
  const products = Object.keys(contexts);
  const [product, setProduct] = useState(products[0]);
  const [frames, setFrames] = useState(contexts[product] || []);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const newFrames = contexts[product] || [];
    setFrames(newFrames);
    // Arranca en el último frame
    setIndex(newFrames.length > 0 ? newFrames.length - 1 : 0);
  }, [product, contexts]);

  const formatoLocal = new Intl.DateTimeFormat("es", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    // timeZone: 'America/Mexico_City'
  });

  const current = frames[index];
  const fecha = current ? new Date(current.timestamp) : null;

  return (
    <div style={{ textAlign: "center", marginTop: "1rem" }}>
      {frames.length > 0 ? (
        <>
          <img
            src={current.src}
            alt={`${product} frame ${index}`}
            style={{ maxWidth: "100%", height: "auto" }}
          />
          <input
            type="range"
            min={0}
            max={frames.length - 1}
            value={index}
            onChange={(e) => setIndex(Number(e.target.value))}
            style={{ width: "100%", marginTop: "0.5rem" }}
          />
        </>
      ) : (
        <p style={{ marginTop: "1rem" }}>No hay frames para {product}</p>
      )}
      <label>
        Producto:&nbsp;
        <select value={product} onChange={(e) => setProduct(e.target.value)}>
          {products.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>

      {current && (
        <p style={{ margin: "0.5rem 0", fontSize: "0.9rem", color: "#555" }}>
          {formatoLocal.format(fecha)} UTC
        </p>
      )}
    </div>
  );
}
