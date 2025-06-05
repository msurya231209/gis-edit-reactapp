import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';

const TYPE_NAME = "ne:features";
const WFS_URL = "http://localhost:8080/geoserver/ne/ows";

const WFSLayer = () => {
  const map = useMap();
  const layerRef = useRef(null);
  const drawnItems = useRef(new L.FeatureGroup());

  const fetchFeatures = () => {
    fetch(`${WFS_URL}?service=WFS&version=1.0.0&request=GetFeature&typeName=${TYPE_NAME}&outputFormat=application/json`)
      .then((res) => res.json())
      .then((data) => {
        if (layerRef.current) {
          drawnItems.current.removeLayer(layerRef.current);
        }
        layerRef.current = L.geoJSON(data, {
          onEachFeature: (feature, layer) => {
            layer.feature = feature;
            //drawnItems.addLayer(layer); 
          }
        });
        drawnItems.current.addLayer(layerRef.current);
      })
      .catch((err) => console.error("WFS fetch error:", err));
  };

  useEffect(() => {
  const drawnItems = new L.FeatureGroup();
  map.addLayer(drawnItems);

  const drawControl = new L.Control.Draw({
    edit: {
      featureGroup: drawnItems,
      remove: true,
    },
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

  const fetchFeatures = () => {
    fetch(`${WFS_URL}?service=WFS&version=1.0.0&request=GetFeature&typeName=${TYPE_NAME}&outputFormat=application/json`)
      .then((res) => res.json())
      .then((data) => {
        drawnItems.clearLayers(); // 🧹 clear existing before re-adding
        L.geoJSON(data, {
          onEachFeature: (feature, layer) => {
            layer.feature = feature;
            drawnItems.addLayer(layer); // ✅ Add to editable group
          },
        });
      })
      .catch((err) => console.error("WFS fetch error:", err));
  };

  fetchFeatures();

  map.on(L.Draw.Event.CREATED, (e) => {
    const layer = e.layer;
    drawnItems.addLayer(layer);
    const geojson = layer.toGeoJSON();
    const gml = gmlFromGeometry(geojson.geometry);

    const insertXml = `
      <wfs:Transaction service="WFS" version="1.0.0"
        xmlns:wfs="http://www.opengis.net/wfs"
        xmlns:gml="http://www.opengis.net/gml"
        xmlns:ogc="http://www.opengis.net/ogc"
        xmlns:ne="http://www.naturalearthdata.com"
      >
        <wfs:Insert>
          <${TYPE_NAME.split(':')[1]}>
            <ne:geom>${gml}</ne:geom>
          </${TYPE_NAME.split(':')[1]}>
        </wfs:Insert>
      </wfs:Transaction>
    `;
    sendTransaction(insertXml, fetchFeatures);
  });

  map.on(L.Draw.Event.EDITED, (e) => {
    e.layers.eachLayer((layer) => {
      if (!layer.feature || !layer.feature.id) return;
      const id = layer.feature.id;
      const geojson = layer.toGeoJSON();
      const gml = gmlFromGeometry(geojson.geometry);

      const updateXml = `
        <wfs:Transaction service="WFS" version="1.0.0"
          xmlns:wfs="http://www.opengis.net/wfs"
          xmlns:gml="http://www.opengis.net/gml"
          xmlns:ogc="http://www.opengis.net/ogc"
          xmlns:ne="http://www.naturalearthdata.com"
        >
          <wfs:Update typeName="${TYPE_NAME}">
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
      sendTransaction(updateXml, fetchFeatures);
    });
  });

  map.on(L.Draw.Event.DELETED, (e) => {
    e.layers.eachLayer((layer) => {
      if (!layer.feature || !layer.feature.id) return;
      const id = layer.feature.id;

      const deleteXml = `
        <wfs:Transaction service="WFS" version="1.0.0"
          xmlns:wfs="http://www.opengis.net/wfs"
          xmlns:ogc="http://www.opengis.net/ogc"
        >
          <wfs:Delete typeName="${TYPE_NAME}">
            <ogc:Filter>
              <ogc:FeatureId fid="${id}" />
            </ogc:Filter>
          </wfs:Delete>
        </wfs:Transaction>
      `;
      sendTransaction(deleteXml, fetchFeatures);
    });
  });
}, [map]);

  return null;
};

function sendTransaction(xmlString, onSuccess) {
  fetch(WFS_URL, {
    method: "POST",
    headers: { "Content-Type": "text/xml" },
    body: xmlString
  })
    .then((res) => res.text())
    .then((responseText) => {
      console.log("WFS-T response:", responseText);
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
    default:
      console.warn("Unsupported geometry type:", geometry.type);
      return '';
  }
}

export default WFSLayer;