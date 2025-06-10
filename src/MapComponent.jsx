import React, { useState } from 'react';
import { MapContainer, TileLayer, WMSTileLayer } from 'react-leaflet';
import WFSLayer from './WFSLayer';
import LayerListWidget from './components/LayerListWidget';
import BottomPane from "./BottomPane";
import 'leaflet/dist/leaflet.css';

function MapComponent() {
  const [layerFeatures, setLayerFeatures] = useState([]);

  const [editableLayers, setEditableLayers] = useState([]);
  const [activeWMSLayers, setActiveWMSLayers] = useState([])

  const wfsLayers = [
    { name: 'features', label: 'Features', type: 'WFS' },
    { name: 'HYD_rails', label: 'HYD Rail Roads', type: 'WFS' }
  ];

  const wmsLayers = [
    { name: 'IND_adm1', label: 'State Boundaries', type: 'WMS' },
    { name: 'TGAdminBoundares3', label: 'TG Taluka Boundaries', type: 'WMS' },
    { name: 'IND_rails', label: 'Rail Roads', type: 'WMS' }
  ];


  return (
    <div>
      <LayerListWidget
        wfsLayers={wfsLayers}
        wmsLayers={wmsLayers}
        editableLayers={editableLayers}
        setEditableLayers={setEditableLayers}
        activeWMSLayers={activeWMSLayers}
        setActiveWMSLayers={setActiveWMSLayers}
      />

      <MapContainer center={[17.385044, 78.486671]} zoom={12} style={{ height: '55vh' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />
        {activeWMSLayers.map(layerName => (
          <WMSTileLayer
            key={layerName}
            url="http://localhost:8080/geoserver/ne/wms"
            layers={layerName}
            format="image/png"
            transparent={true}
            attribution="GeoServer"
          />
        ))}
        
        <WFSLayer editableLayers={editableLayers} onFeaturesUpdate={(features) => setLayerFeatures(features)}/>
        
      </MapContainer>
      <BottomPane data={layerFeatures}/>
    </div>
  );
}

export default MapComponent;
