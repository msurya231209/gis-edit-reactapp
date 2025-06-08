// src/components/WFSLayer.jsx
import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';

const WFS_URL = "http://localhost:8080/geoserver/ne/ows";

const WFSLayer = ({ editableLayers }) => {
  const map = useMap();
  const drawnItems = useRef(new L.FeatureGroup());

  useEffect(() => {
    map.addLayer(drawnItems.current);

    const drawControl = new L.Control.Draw({
      edit: { featureGroup: drawnItems.current, remove: true },
      draw: {
        polygon: true,
        polyline: true,
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: true,
      },
    });
    map.addControl(drawControl);

    const handleCreate = (e) => {
      const layer = e.layer;
      drawnItems.current.addLayer(layer);
      const geojson = layer.toGeoJSON();
      const gml = gmlFromGeometry(geojson.geometry);
      const layerName = editableLayers[0];
      if (!layerName || !gml) return;

      const insertXml = `
        <wfs:Transaction service="WFS" version="1.0.0"
          xmlns:wfs="http://www.opengis.net/wfs"
          xmlns:gml="http://www.opengis.net/gml"
          xmlns:ogc="http://www.opengis.net/ogc"
          xmlns:ne="http://www.naturalearthdata.com"
        >
          <wfs:Insert>
            <${layerName}>
              <ne:geom>${gml}</ne:geom>
            </${layerName}>
          </wfs:Insert>
        </wfs:Transaction>
      `;
      sendTransaction(insertXml, () => fetchFeatures(layerName));
    };

    const handleEdit = (e) => {
      const layerName = editableLayers[0];
      if (!layerName) return;

      e.layers.eachLayer((layer) => {
        if (!layer.feature?.id) return;
        const id = layer.feature.id;
        const geojson = layer.toGeoJSON();
        const gml = gmlFromGeometry(geojson.geometry);
        if (!gml) return;

        const updateXml = `
          <wfs:Transaction service="WFS" version="1.0.0"
            xmlns:wfs="http://www.opengis.net/wfs"
            xmlns:gml="http://www.opengis.net/gml"
            xmlns:ogc="http://www.opengis.net/ogc"
            xmlns:ne="http://www.naturalearthdata.com"
          >
            <wfs:Update typeName="ne:${layerName}">
              <wfs:Property>
                <wfs:Name>geom</wfs:Name>
                <wfs:Value>${gml}</wfs:Value>
              </wfs:Property>
              <ogc:Filter>
                <ogc:FeatureId fid="${id}" />
              </ogc:Filter>
            </wfs:Update>
          </wfs:Transaction>
        `;
        sendTransaction(updateXml, () => fetchFeatures(layerName));
      });
    };

    const handleDelete = (e) => {
      const layerName = editableLayers[0];
      if (!layerName) return;

      e.layers.eachLayer((layer) => {
        if (!layer.feature?.id) return;
        const id = layer.feature.id;

        const deleteXml = `
          <wfs:Transaction service="WFS" version="1.0.0"
            xmlns:wfs="http://www.opengis.net/wfs"
            xmlns:ogc="http://www.opengis.net/ogc"
          >
            <wfs:Delete typeName="ne:${layerName}">
              <ogc:Filter>
                <ogc:FeatureId fid="${id}" />
              </ogc:Filter>
            </wfs:Delete>
          </wfs:Transaction>
        `;
        sendTransaction(deleteXml, () => fetchFeatures(layerName));
      });
    };

    map.on(L.Draw.Event.CREATED, handleCreate);
    map.on(L.Draw.Event.EDITED, handleEdit);
    map.on(L.Draw.Event.DELETED, handleDelete);

    return () => {
      map.removeControl(drawControl);
      map.off(L.Draw.Event.CREATED, handleCreate);
      map.off(L.Draw.Event.EDITED, handleEdit);
      map.off(L.Draw.Event.DELETED, handleDelete);
    };
  }, [map, editableLayers]);

  useEffect(() => {
    if (editableLayers.length > 0) {
      fetchFeatures(editableLayers[0]);
    } else {
      drawnItems.current.clearLayers();
    }
  }, [editableLayers]);

  const fetchFeatures = (typeName) => {
    fetch(`${WFS_URL}?service=WFS&version=1.0.0&request=GetFeature&typeName=ne:${typeName}&outputFormat=application/json`)
      .then((res) => res.json())
      .then((data) => {
        drawnItems.current.clearLayers();
        L.geoJSON(data, {
          onEachFeature: (feature, layer) => {
            layer.feature = feature;
            drawnItems.current.addLayer(layer);
          },
        });
      })
      .catch((err) => console.error("WFS fetch error:", err));
  };

  return null;
};

function sendTransaction(xmlString, onSuccess) {
  fetch(WFS_URL, {
    method: "POST",
    headers: { "Content-Type": "text/xml" },
    body: xmlString,
  })
    .then((res) => res.text())
    .then((responseText) => {
      parseWFSTResponse(responseText);
      onSuccess();
    })
    .catch((err) => console.error("WFS-T error:", err));
}

function gmlFromGeometry(geometry) {
  switch (geometry.type) {
    case "Point":
      return `<gml:Point srsName="EPSG:4326"><gml:coordinates>${geometry.coordinates.join(",")}</gml:coordinates></gml:Point>`;
    case "LineString":
      return `<gml:LineString srsName="EPSG:4326"><gml:coordinates>${geometry.coordinates.map(c => c.join(",")).join(" ")}</gml:coordinates></gml:LineString>`;
    case "Polygon":
      return `<gml:Polygon srsName="EPSG:4326"><gml:outerBoundaryIs><gml:LinearRing><gml:coordinates>${geometry.coordinates[0].map(c => c.join(",")).join(" ")}</gml:coordinates></gml:LinearRing></gml:outerBoundaryIs></gml:Polygon>`;
    case "MultiLineString":
      return `<gml:MultiLineString srsName="EPSG:4326">` +
        geometry.coordinates.map(line =>
          `<gml:lineStringMember><gml:LineString><gml:coordinates>${line.map(c => c.join(",")).join(" ")}</gml:coordinates></gml:LineString></gml:lineStringMember>`
        ).join("") +
        `</gml:MultiLineString>`;
    default:
      console.warn("❌ Unsupported geometry type:", geometry.type);
      return '';
  }
}

function parseWFSTResponse(responseText) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(responseText, "text/xml");

  if (xmlDoc.getElementsByTagName("wfs:InsertResult").length > 0) {
    const fid = xmlDoc.getElementsByTagName("ogc:FeatureId")[0]?.getAttribute("fid") || "unknown";
    console.log(`✅ Insert successful. Feature ID: ${fid}`);
  } else if (xmlDoc.getElementsByTagName("wfs:UpdateResult").length > 0) {
    console.log("✅ Update successful.");
  } else if (xmlDoc.getElementsByTagName("wfs:DeleteResult").length > 0) {
    console.log("✅ Delete successful.");
  } else {
    console.warn("⚠️ WFS-T response unrecognized:", responseText);
  }
}

export default WFSLayer;
