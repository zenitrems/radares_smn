import { useState } from 'react';

const gifs = [
  '../sondeos/CANC/CMAX_REFL/CANC_CMAX_REFL_300_XXXX_20250707_050206.gif',
  '../sondeos/CANC/CMAX_REFL/CANC_CMAX_REFL_300_XXXX_20250707_051200.gif', 
  '../sondeos/CANC/CMAX_REFL/CANC_CMAX_REFL_300_XXXX_20250707_052005.gif', 
  '../sondeos/CANC/CMAX_REFL/CANC_CMAX_REFL_300_XXXX_20250707_053000.gif', 
  '../sondeos/CANC/CMAX_REFL/CANC_CMAX_REFL_300_XXXX_20250707_053806.gif'
];

export default function GifSlider() {
  const [index, setIndex] = useState(0);

  return (
    <div style={{ textAlign: 'center', marginTop: '1rem' }}>
      <img src={gifs[index]} style={{ maxWidth: '100%', height: 'auto' }} />
      <input
        type="range"
        min="0"
        max={gifs.length - 1}
        value={index}
        onChange={e => setIndex(Number(e.target.value))}
        style={{ width: '100%' }}
      />
    </div>
  );
}