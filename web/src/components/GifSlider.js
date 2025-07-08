import React, { useState, useEffect } from 'react';

export default function GifSlider({ contexts }) {
  const products = Object.keys(contexts);
  const [product, setProduct] = useState(products[0]);
  const [frames, setFrames] = useState(contexts[product] || []);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setFrames(contexts[product] || []);
    setIndex(0);
  }, [product, contexts]);

  return (
    <div style={{ textAlign: 'center', marginTop: '1rem' }}>
      <select value={product} onChange={e => setProduct(e.target.value)}>
        {products.map(p => (
          <option key={p} value={p}>{p}</option>
        ))}
        {console.log(product)}
      </select>

      {frames.length > 0 ? (
        <>
          <img
            src={frames[index]}
            alt={`${product} frame ${index}`}
            style={{ maxWidth: '100%', height: 'auto', marginTop: '1rem' }}
          />
          <input
            type="range"
            min={0}
            max={frames.length - 1}
            value={index}
            onChange={e => setIndex(Number(e.target.value))}
            style={{ width: '100%', marginTop: '0.5rem' }}
          />
        </>
      ) : (
        <p style={{ marginTop: '1rem' }}>No hay frames para {product}</p>
      )}
    </div>
  );
}