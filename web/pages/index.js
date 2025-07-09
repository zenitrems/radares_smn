import { useState } from "react";
import dynamic from "next/dynamic";
import path from "path";
import fs from "fs";
import radarsConfig from "../radares.json";
import "leaflet/dist/leaflet.css";

const Map = dynamic(() => import("../src/components/Map"), { ssr: false });
const GifSlider = dynamic(() => import("../src/components/GifSlider"), { ssr: false });

function parseTime(filename) {
  const m = filename.match(/_(\d{8})_(\d{6})\.gif$/);
  if (!m) return null;
  const [_, date, time] = m;
  const y = +date.slice(0, 4);
  const mo = +date.slice(4, 6) - 1;
  const d = +date.slice(6, 8);
  const h = +time.slice(0, 2);
  const mi = +time.slice(2, 4);
  const s = +time.slice(4, 6);
  return new Date(Date.UTC(y, mo, d, h, mi, s)).toUTCString();
}

export async function getStaticProps() {
  const contexts = {};

  for (const radar of radarsConfig) {
    const prefix = radar.products[0].filter.split("_")[0];
    const radarDir = path.join(process.cwd(), "public", "sondeos", prefix);
    contexts[radar.urlName] = {};

    for (const prod of radar.products) {
      if (!prod.show) {
        contexts[radar.urlName][prod.urlName] = [];
        continue;
      }
      const prodFolder = prod.urlName.toUpperCase();
      const dirPath = path.join(radarDir, prodFolder);
      let files = [];

      if (fs.existsSync(dirPath)) {
        files = fs
          .readdirSync(dirPath)
          .filter((f) => f.endsWith(".gif"))
          .sort((a, b) => parseTime(a).localeCompare(parseTime(b)))
          .map((f) => ({
            src: `/sondeos/${prefix}/${prodFolder}/${f}`,
            timestamp: parseTime(f),
          }));
      }

      contexts[radar.urlName][prod.urlName] = files;
    }
  }

  return {
    props: { contexts, radarsConfig },
  };
}

export default function Home({ contexts, radarsConfig }) {
  const [selectedRadar, setSelectedRadar] = useState(radarsConfig[0].urlName);
  const [overlayFrame, setOverlayFrame] = useState(null);
  const [mapConfig, setMapConfig] = useState(null);

  function handleFrameChange(productUrlName, index, frame) {
    setOverlayFrame(frame);
    const radar = radarsConfig.find((r) => r.urlName === selectedRadar);
    const prodConf = radar.products.find((p) => p.urlName === productUrlName);
    setMapConfig(prodConf.map);
  }

  const sliderContexts = contexts[selectedRadar] || {};

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "0.5rem" }}>
        <label>
          Radar:&nbsp;
          <select
            value={selectedRadar}
            onChange={(e) => {
              setSelectedRadar(e.target.value);
              setOverlayFrame(null);
              setMapConfig(null);
            }}
          >
            {radarsConfig.map((r) => (
              <option key={r.urlName} value={r.urlName}>
                {r.showName}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ flex: 1 }}>
        <Map overlay={overlayFrame} mapConfig={mapConfig} />
      </div>

      <div style={{ padding: "1rem", background: "#f5f5f5" }}>
        <GifSlider contexts={sliderContexts} onFrameChange={handleFrameChange} />
      </div>
    </div>
  );
}
