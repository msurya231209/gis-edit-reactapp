import React, { useState } from "react";
import "./LayerListWidget.css";

const LayerListWidget = ({
  layers = [],
  selectedLayer,
  onSelectLayer,
  activeWMSLayers = [],
  onSetActiveWMSLayers,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [activeTab, setActiveTab] = useState("wfs");

  const getShortName = (layer) => (layer.includes(":") ? layer.split(":")[1] : layer);

  const wfsLayerNames = ["features", "HYD_rails"];
  const wmsLayerNames = ["IND_rails", "IND_adm1", "TGAdminBoundares3"];

  const wfsLayers = wfsLayerNames.map((name) => ({
    name,
    editable: true,
    type: "WFS"
  }));

  const wmsLayers = wmsLayerNames.map((name) => ({
    name,
    editable: false,
    type: "WMS"
  }));

  const renderLayerItems = (layerList) => {
    return layerList.map((layer) => {
      const fullLayerName = layers.find((l) => getShortName(l) === layer.name) || layer.name;
      const isSelected =
        (layer.type === "WFS" && selectedLayer?.name === fullLayerName) ||
        (layer.type === "WMS" && activeWMSLayers.includes(fullLayerName));
      return (
        <label
          key={layer.name}
          className={`layer-item ${isSelected ? "selected" : ""}`}
          onClick={() => {
            if (layer.type === "WFS") {
              onSelectLayer({ name: fullLayerName, editable: layer.editable, type: layer.type });
              onSetActiveWMSLayers([]); // Clear WMS selection
            } else if (layer.type === "WMS") {
              onSetActiveWMSLayers([fullLayerName]);
              onSelectLayer(null); // Clear WFS selection
            }
          }}
        >
          {layer.name}{" "}
          <span style={{ fontSize: "11px", color: layer.editable ? "green" : "#888" }}>
            ({layer.editable ? "Editable" : "Not Editable"})
          </span>
        </label>
      );
    });
  };

  return (
    <div
      className={`layer-list-widget ${isHovered ? "expanded" : "collapsed"}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered ? (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <button
              className={activeTab === "wfs" ? "tab-button active" : "tab-button"}
              onClick={() => setActiveTab("wfs")}
            >
              WFS Layers
            </button>
            <button
              className={activeTab === "wms" ? "tab-button active" : "tab-button"}
              onClick={() => setActiveTab("wms")}
            >
              WMS Layers
            </button>
          </div>
          {activeTab === "wfs" ? renderLayerItems(wfsLayers) : renderLayerItems(wmsLayers)}
        </>
      ) : (
        <div className="layerlist-toggle-btn" title="Layer List">⚙️</div>
      )}
    </div>
  );
};

export default LayerListWidget;
