import React from 'react';
import './LayerListWidget.css';

const LayerListWidget = ({ wfsLayers = [], wmsLayers = [], editableLayers, setEditableLayers, activeWMSLayers, setActiveWMSLayers }) => {
  const handleWFSRadio = (layerName) => {
    setEditableLayers([layerName]);
  };

  const toggleWMSLayer = (layerName) => {
    if (activeWMSLayers.includes(layerName)) {
      setActiveWMSLayers(activeWMSLayers.filter(name => name !== layerName));
    } else {
      setActiveWMSLayers([...activeWMSLayers, layerName]);
    }
  };

  return (
    <div className="layer-list-widget">
      <h4>Layers List</h4>

      <strong>WFS Layers</strong>
      {wfsLayers.map(layer => (
        <label key={layer.name}>
          <input
            type="radio"
            name="wfs-layer"
            checked={editableLayers.includes(layer.name)}
            onChange={() => handleWFSRadio(layer.name)}
          />
          {layer.label}
        </label>
      ))}

      <strong>WMS Layers</strong>
      {wmsLayers.map(layer => (
        <label key={layer.name}>
          <input
            type="checkbox"
            checked={activeWMSLayers.includes(layer.name)}
            onChange={() => toggleWMSLayer(layer.name)}
          />
          {layer.label}
        </label>
      ))}
    </div>
  );
};

export default LayerListWidget;
