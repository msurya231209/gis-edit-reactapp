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
  const wfsLayerRef = useRef();
  const [features, setFeatures] = useState([]);


  const wfsLayers = [
    { name: 'features', label: 'Features', type: 'WFS' },
    { name: 'HYD_rails', label: 'HYD Rail Roads', type: 'WFS' }
  ];

  const wmsLayers = [
    { name: 'IND_adm1', label: 'State Boundaries', type: 'WMS' },
    { name: 'TGAdminBoundares3', label: 'TG Taluka Boundaries', type: 'WMS' },
    { name: 'IND_rails', label: 'Rail Roads', type: 'WMS' }
  ];
  const callHandleEditFromWFS = (feature) => {
    if (wfsLayerRef.current && feature) {
      wfsLayerRef.current.handleEdit(feature);
    } else {
      console.warn("WFSLayer ref or feature is undefined");
    }
  };

  const onEdit = (feature) => {
    setSelectedFeature(feature); // or your editing logic
  };

  const onSaveEdit = () => {
    if (selectedFeature) {
      callHandleEditFromWFS(selectedFeature); // <-- pass the actual feature object
    } else {
      console.warn("No feature selected to save");
    }
  };

  const onDelete = (feature) => {
    console.log("wfsLayerRef.current:", wfsLayerRef.current);
    if (wfsLayerRef.current && wfsLayerRef.current.handleDelete) {
      wfsLayerRef.current.handleDelete(feature);
      setSelectedFeature(null);
    } else {
      console.warn("deleteFeature not available on wfsLayerRef");
    }
  };

  const handleFeatureSelect = (feature) => {
    setSelectedFeature(feature);

    const map = mapRef.current;

    if (!feature || !feature.geometry) {
      console.warn("Selected feature has no geometry");
      return;
    }

    try {
      const geojsonLayer = L.geoJSON(feature);
      const bounds = geojsonLayer.getBounds();

      if (!bounds || !bounds.isValid()) {
        console.warn("Invalid bounds for feature geometry:", feature.geometry);
        return;
      }

      if (map && map.flyToBounds) {
        map.flyToBounds(bounds, { padding: [20, 20] });
      }
    } catch (err) {
      console.error("Error computing bounds for feature:", err);
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
          ref={wfsLayerRef}
          map={mapRef.current}
          editableLayers={editableLayers}
          onFeaturesUpdate={setLayerFeatures}
          setSelectedFeature={setSelectedFeature}
        />
      </MapContainer>

      <BottomPane
        features={features}
        onFeatureSelect={(feature) => {
          setSelectedFeature(feature);
        }}
        onEdit={onEdit}
        onDelete={onDelete}
        data={layerFeatures}
        setSelectedFeature={handleFeatureSelect}
        selectedFeature={selectedFeature}
        map={mapRef.current}
        onSaveEdit={(updatedFeature) => wfsLayerRef.current?.handleEdit(updatedFeature)}
      />
    </div>
  );
}

export default MapComponent;
