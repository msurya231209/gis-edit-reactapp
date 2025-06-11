import React, { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, WMSTileLayer } from "react-leaflet";
import WFSLayer from "./WFSLayer";
import LayerListWidget from "./components/LayerListWidget";
import BottomPane from "./BottomPane";
import L from "leaflet";

function MapComponent() {
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [layerFeatures, setLayerFeatures] = useState([]);
  const [editableLayers, setEditableLayers] = useState([]);
  const [activeWMSLayers, setActiveWMSLayers] = useState([]);
  const mapRef = useRef(null);

  const wfsLayers = [
    { name: 'features', label: 'Features', type: 'WFS' },
    { name: 'HYD_rails', label: 'HYD Rail Roads', type: 'WFS' }
  ];

  const wmsLayers = [
    { name: 'IND_adm1', label: 'State Boundaries', type: 'WMS' },
    { name: 'TGAdminBoundares3', label: 'TG Taluka Boundaries', type: 'WMS' },
    { name: 'IND_rails', label: 'Rail Roads', type: 'WMS' }
  ];

  const handleFeatureSelect = (feature) => {
    setSelectedFeature(feature);

    const map = mapRef.current;
    const geojsonLayer = L.geoJSON(feature);

    if (map && map.flyToBounds) {
      map.flyToBounds(geojsonLayer.getBounds(), { padding: [20, 20] });
    }
  };

  // Optional: Debug once mapRef is initialized
  useEffect(() => {
    if (mapRef.current) {
      console.log("✅ Map is ready:", mapRef.current);
    }
  }, [mapRef.current]);

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

      <MapContainer
        center={[17.385044, 78.486671]}
        zoom={12}
        style={{ height: '55vh' }}
        ref={mapRef} // correct way in react-leaflet@5
      >
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

        <WFSLayer
          editableLayers={editableLayers}
          onFeaturesUpdate={setLayerFeatures}
          setSelectedFeature={setSelectedFeature}
        />
      </MapContainer>

      <BottomPane
        data={layerFeatures}
        setSelectedFeature={handleFeatureSelect}
        map={mapRef.current} // still okay here, since ref will eventually populate
      />
    </div>
  );
}

export default MapComponent;
