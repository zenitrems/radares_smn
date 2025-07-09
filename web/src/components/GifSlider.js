// src/components/GifSlider.js
import React, { useState, useEffect } from "react";

export default function GifSlider({
  contexts,
  onFrameChange // callback(product, index, frame)
}) {
  const products = Object.keys(contexts);
  const [product, setProduct] = useState(products[0]);
  const [frames, setFrames] = useState(contexts[product] || []);
  const [index, setIndex] = useState(frames.length - 1 || 0);

  // Cada vez que cambien contexts o product, recargamos frames
  useEffect(() => {
    const newFrames = contexts[product] || [];
    setFrames(newFrames);
    setIndex(newFrames.length - 1 >= 0 ? newFrames.length - 1 : 0);
  }, [product, contexts]);

  // Cada vez que cambie el frame (o el producto), lo notificamos al padre
  useEffect(() => {
    const frame = frames[index];
    if (onFrameChange && frame) {
      onFrameChange(product, index, frame);
    }
  }, [product, index, frames, onFrameChange]);

  const formatoLocal = new Intl.DateTimeFormat("es", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    timeZone: "America/Cancun"
  });

  const current = frames[index];

  return (
    <div style={{ textAlign: "center", marginTop: "1rem" }}>
      {frames.length > 0 ? (
        <>
          {/* <img
            src={current.src}
            alt={`${product} frame ${index}`}
            style={{ maxWidth: "100%", height: "auto" }}
          /> */}
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
        <p>No hay frames para {product}</p>
      )}

      <div style={{ marginTop: "0.5rem" }}>
        <label>
          Producto:&nbsp;
          <select
            value={product}
            onChange={(e) => setProduct(e.target.value)}
          >
            {products.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
      </div>

      {current && (
        <p style={{ fontSize: "0.9rem", color: "#555" }}>
          {formatoLocal.format(new Date(current.timestamp))} Z
        </p>
      )}
    </div>
  );
}
