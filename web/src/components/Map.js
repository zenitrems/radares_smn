// src/components/Map.js
import React, { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  ImageOverlay,
  Marker,
  useMap,
} from "react-leaflet";

function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds);
  }, [bounds, map]);
  return null;
}

export default function Map({ overlay, mapConfig }) {
  // Mientras no haya config, retornamos un div vacío (o un spinner)
  if (!mapConfig) {
    return <div style={{ height: "100%", width: "100%" }} />;
  }

  const { bounds, center, zoom, markerCenter } = mapConfig;

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />

      {/* Ajustamos la vista a los bounds */}
      <FitBounds bounds={bounds} />

      {/* Marcador en el centro del radar */}
      {markerCenter && <Marker position={markerCenter} />}

      {/* Capa de GIF */}
      {overlay && (
        <ImageOverlay
          url={overlay.src}
          bounds={bounds}
          opacity={1.0}
          crossOrigin={true}
        />
      )}
    </MapContainer>
  );
}
