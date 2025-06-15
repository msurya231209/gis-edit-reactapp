import React, { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, WMSTileLayer } from "react-leaflet";
import WFSLayer from "./WFSLayer";
import LayerListWidget from "./components/LayerListWidget";
import BottomPane from "./BottomPane";
import L from "leaflet";

function MapComponent() {
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [layerFeatures, setLayerFeatures] = useState([]);
  const [selectedLayer, setSelectedLayer] = useState(null); // ✅ now tracking selected WFS layer
  const [activeWMSLayers, setActiveWMSLayers] = useState([]);
  const mapRef = useRef(null);
  const wfsLayerRef = useRef();
  const [features, setFeatures] = useState([]);
  const [availableWfsLayers, setAvailableWfsLayers] = useState([]); // ✅ loaded from GeoServer

  // Replace with the exact names as shown in GeoServer admin UI
const wmsLayers = [
  { name: 'IND_adm1', label: 'State Boundaries', type: 'WMS' },
  { name: 'ne:TGAdminBoundares3', label: 'TG Taluka Boundaries', type: 'WMS' }, // Corrected spelling
  { name: 'ne:IND_rails', label: 'Rail Roads', type: 'WMS' }
];

  const callHandleEditFromWFS = (feature) => {
    if (wfsLayerRef.current && feature) {
      wfsLayerRef.current.handleEdit(feature);
    } else {
      console.warn("WFSLayer ref or feature is undefined");
    }
  };

  const onEdit = (feature) => {
    setSelectedFeature(feature);
  };

  const onSaveEdit = () => {
    if (selectedFeature) {
      callHandleEditFromWFS(selectedFeature);
    } else {
      console.warn("No feature selected to save");
    }
  };

  const onDelete = (feature) => {
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

  // ✅ Load WFS layers from GeoServer and filter only 'ne:' namespace
  useEffect(() => {
    fetch("http://localhost:8080/geoserver/wfs?service=WFS&request=GetCapabilities")
      .then(res => res.text())
      .then(xmlText => {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "application/xml");
        const featureTypes = xmlDoc.getElementsByTagName("FeatureType");

        const layerNames = [];
        for (let i = 0; i < featureTypes.length; i++) {
          const nameEl = featureTypes[i].getElementsByTagName("Name")[0];
          if (nameEl && nameEl.textContent.startsWith("ne:")) {
            layerNames.push(nameEl.textContent);
          }
        }

        setAvailableWfsLayers(layerNames);
        console.log("✅ Loaded WFS layers (filtered):", layerNames);
      })
      .catch(err => {
        console.error("Failed to load WFS layers:", err);
      });
  }, []);

  return (
    <div>
      <LayerListWidget
        layers={availableWfsLayers}           // ✅ filtered WFS layers
        selectedLayer={selectedLayer}         // ✅ current selected layer
        onSelectLayer={setSelectedLayer}      // ✅ callback to update selectedLayer
        wmsLayers={wmsLayers}
        activeWMSLayers={activeWMSLayers}
        onSetActiveWMSLayers={setActiveWMSLayers}
      />

      <MapContainer
        center={[17.385044, 78.486671]}
        zoom={12}
        style={{ height: '55vh' }}
        ref={mapRef}
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
          editableLayers={selectedLayer && selectedLayer.type === "WFS" ? [selectedLayer] : []} // ✅ only selected WFS layer
          onFeaturesUpdate={setLayerFeatures}
          setSelectedFeature={setSelectedFeature}
        />
      </MapContainer>

      <BottomPane
        features={features}
        onFeatureSelect={(feature) => setSelectedFeature(feature)}
        onEdit={onEdit}
        onDelete={onDelete}
        data={layerFeatures}
        setSelectedFeature={handleFeatureSelect}
        selectedFeature={selectedFeature}
        map={mapRef.current}
        onSaveEdit={(updatedFeature) => wfsLayerRef.current?.handleEdit(updatedFeature)}
        onDeleteFeature={onDelete}
      />
    </div>
  );
}

export default MapComponent;
