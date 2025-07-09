import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

export default function Map({ radars }) {
  /* const position = [23.6345, -102.5528]; // Center of Mexico */
  const position = [21.028969, -86.852031]; // Center of radar cancun
  

  return (
    <MapContainer center={position} zoom={9} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {radars.filter(r => r.show).map(radar => (
        <Marker key={radar.urlName} position={radar.markerCenter} icon={L.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
        })}>
          <Popup>{radar.showName}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
