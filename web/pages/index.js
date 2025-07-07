import dynamic from 'next/dynamic';
import radars from '../radares.json';
import 'leaflet/dist/leaflet.css';

const Map = dynamic(() => import('../src/Map'), { ssr: false });

export default function Home() {
  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <Map radars={radars} />
    </div>
  );
}
