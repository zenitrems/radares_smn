import dynamic from 'next/dynamic';
import radars from '../radares.json';
import 'leaflet/dist/leaflet.css';

const Map = dynamic(() => import('../src/Map'), { ssr: false });
const GifSlider = dynamic(() => import('../src/GifSlider'), { ssr: false });

export default function Home() {
  return (
    <div>
      <div style={{ height: '60vh', width: '100%' }}>
        <Map radars={radars} />
      </div>
      <GifSlider />
    </div>
  );
}