import dynamic from "next/dynamic";
import path from "path";
import fs from "fs";
import radars from "../radares.json";
import "leaflet/dist/leaflet.css";

const Map = dynamic(() => import("../src/components/Map"), { ssr: false });
const GifSlider = dynamic(() => import("../src/components/GifSlider"), {
  ssr: false,
});
const RADARES = ["SABANCUY", "CANCUN"];
const PRODUCTS = [
  "CMAX_REFL",
  "PPIX_REFL_300",
  "PPIX_REFL_450",
  "PPIX_VELO_120",
];

function parseTime(filename) {
  const match = filename.match(/_(\d{8})_(\d{6})\.gif$/);
  if (!match) return null;
  const [_, date, time] = match;
  const year = +date.slice(0, 4);
  const month = +date.slice(4, 6) - 1;
  const day = +date.slice(6, 8);
  const hour = +time.slice(0, 2);
  const minute = +time.slice(2, 4);
  const second = +time.slice(4, 6);
  return new Date(year, month, day, hour, minute, second).toUTCString();
}

export async function getStaticProps() {
  const baseDir = path.join(process.cwd(), "public/sondeos/CANC");
  const contexts = {};
  const PRODUCTS = [
    "CMAX_REFL",
    "PPIX_REFL_300",
    "PPIX_REFL_450",
    "PPIX_VELO_120",
  ];

  for (const prod of PRODUCTS) {
    const dirPath = path.join(baseDir, prod);
    const files = fs
      .readdirSync(dirPath)
      .filter((f) => f.endsWith(".gif"))
      .sort((a, b) => parseTime(a).localeCompare(parseTime(b)))
      .map((f) => {
        const timestamp = parseTime(f);
        return {
          src: `/sondeos/CANC/${prod}/${f}`,
          timestamp,
        };
      });
    contexts[prod] = files;
  }

  return { props: { contexts } };
}

export default function Home({ contexts }) {
  return (
    <div>
      {/* <div className="map-area" style={{ height: "60vh" }}>
        <Map radars={radars} />
      </div> */}

      <GifSlider contexts={contexts} />
    </div>
  );
}
