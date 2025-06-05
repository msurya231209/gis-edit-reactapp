import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import WFSLayer from './WFSLayer';
import WMSLayer from './WMSLayer';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';

const MapComponent = () => (
  <MapContainer center={[22, 78]} zoom={5} style={{ height: '600px', width: '100%' }}>
    <TileLayer
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      attribution="&copy; OpenStreetMap contributors"
    />
    <WMSLayer/>
    <WFSLayer/>
  </MapContainer>
);

export default MapComponent;
