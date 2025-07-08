import dynamic from 'next/dynamic';
import path from 'path';
import fs from 'fs';
import radars from '../radares.json';
import 'leaflet/dist/leaflet.css';

const Map = dynamic(() => import('../src/Map'), { ssr: false });
const GifSlider = dynamic(() => import('../src/components/GifSlider'), { ssr: false });
const RADARES = ['SABANCUY', 'CANCUN']
const PRODUCTS = ['CMAX_REFL', 'PPIX_REFL_300', 'PPIX_REFL_450', 'PPIX_VELO_120'];

function parseTime(filename) {
  const match = filename.match(/_(\d{8})_(\d{6})\.gif$/);
  if (!match) return 0;
  const [_, date, time] = match;
  const year = +date.slice(0,4);
  const month = +date.slice(4,6) - 1;
  const day = +date.slice(6,8);
  const hour = +time.slice(0,2);
  const minute = +time.slice(2,4);
  const second = +time.slice(4,6);
  return new Date(year, month, day, hour, minute, second).getTime();
}

export async function getStaticProps() {
  const baseDir = path.join(process.cwd(), 'public/sondeos/CANC');

  const contexts = {};

  for (const prod of PRODUCTS) {
    const dirPath = path.join(baseDir, prod);
    const files = fs.readdirSync(dirPath)
      .filter(f => f.endsWith('.gif'))
      .sort((a, b) => parseTime(a) - parseTime(b))
      .map(f => `/sondeos/CANC/${prod}/${f}`);
    contexts[prod] = files;
  }

  return { props: { contexts, radars } };
}

export default function Home({ contexts, radars }) {
  return (
    <div style={{ height: '60vh', width: '100%' }}>
      {/* <div style={{ height: '60vh', width: '100%' }}>
        <Map radars={radars} contexts={contexts} />
      </div> */}
      <GifSlider contexts={contexts} />
    </div>
  );
}
