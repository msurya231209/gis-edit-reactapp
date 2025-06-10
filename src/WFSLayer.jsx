import React, { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";

const WFS_URL = "http://localhost:8080/geoserver/ne/ows";

const WFSLayer = ({ editableLayers, onFeaturesUpdate  }) => {
  const map = useMap();
  const drawnItems = useRef(new L.FeatureGroup());
  const popupRef = useRef(null);

  // Selected feature and its editable attribute values
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [attributeValues, setAttributeValues] = useState({});

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

    // Handle feature creation - insert WFS-T
    const handleCreate = (e) => {
      const layer = e.layer;
      drawnItems.current.addLayer(layer);
      const geojson = layer.toGeoJSON();

      const layerName = editableLayers[0];
      if (!layerName) return;

      const gml = gmlFromGeometry(geojson.geometry);

      // Create Insert transaction XML
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
              <ne:name>New Feature</ne:name>
            </${layerName}>
          </wfs:Insert>
        </wfs:Transaction>
      `;

      sendTransaction(insertXml, () => fetchFeatures(layerName));
    };

    // Handle edits (geometry or attributes) - update WFS-T
    const handleEdit = (e) => {
      const layerName = editableLayers[0];
      if (!layerName) return;

      e.layers.eachLayer((layer) => {
        if (!layer.feature?.id) return;

        const id = layer.feature.id;
        const geojson = layer.toGeoJSON();
        const gml = gmlFromGeometry(geojson.geometry);

        // Prepare properties XML from layer.feature.properties
        const propertiesXml = Object.entries(layer.feature.properties || {})
          .map(
            ([key, value]) => `
          <wfs:Property>
            <wfs:Name>${key}</wfs:Name>
            <wfs:Value>${value}</wfs:Value>
          </wfs:Property>
        `
          )
          .join("");

        const updateXml = `
          <wfs:Transaction service="WFS" version="1.0.0"
            xmlns:wfs="http://www.opengis.net/wfs"
            xmlns:gml="http://www.opengis.net/gml"
            xmlns:ogc="http://www.opengis.net/ogc"
            xmlns:ne="http://www.naturalearthdata.com"
          >
            <wfs:Update typeName="${layerName}">
              <wfs:Property>
                <wfs:Name>geom</wfs:Name>
                <wfs:Value>${gml}</wfs:Value>
              </wfs:Property>
              ${propertiesXml}
              <ogc:Filter>
                <ogc:FeatureId fid="${id}" />
              </ogc:Filter>
            </wfs:Update>
          </wfs:Transaction>
        `;

        sendTransaction(updateXml, () => fetchFeatures(layerName));
      });
    };

    // Handle deletion - delete WFS-T
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
            <wfs:Delete typeName="${layerName}">
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

  // Fetch WFS features and add to layer
  useEffect(() => {
    if (editableLayers.length > 0) {
      fetchFeatures(editableLayers[0]);
    } else {
      drawnItems.current.clearLayers();
    }
  }, [editableLayers]);

  const fetchFeatures = (typeName) => {
    fetch(
      `${WFS_URL}?service=WFS&version=1.0.0&request=GetFeature&typeName=${typeName}&outputFormat=application/json`
    )
      .then((res) => res.json())
      .then((data) => {
        drawnItems.current.clearLayers();
        const features = data.features;

        if (onFeaturesUpdate) onFeaturesUpdate(features);

        L.geoJSON(data, {
          onEachFeature: (feature, layer) => {
            layer.feature = feature;

            // Assign id to layer.feature.id if missing (GeoServer sometimes uses 'id' or 'fid')
            if (!feature.id && feature.properties && feature.properties.id) {
              feature.id = feature.properties.id;
            }

            layer.on("click", () => {
              setSelectedFeature(feature);
              setAttributeValues({ ...feature.properties });

              // Open popup with form
              const popupContent = createPopupContent(feature);
              if (popupRef.current) {
                popupRef.current.remove();
              }
              popupRef.current = L.popup()
                .setLatLng(
                  layer.getBounds
                    ? layer.getBounds().getCenter()
                    : layer.getLatLng()
                )
                .setContent(popupContent)
                .openOn(map);
            });

            drawnItems.current.addLayer(layer);
          },
        });
        //if (onFeaturesLoad) {
          //onFeaturesLoad(data.features);
        //}
      })
      .catch((err) => console.error("WFS fetch error:", err));
  };

  // Create a GML string from GeoJSON geometry (basic conversion for Point, LineString, Polygon)
  const gmlFromGeometry = (geometry) => {
    if (!geometry) return "";

    const coordsToPosList = (coords) =>
      coords.map((c) => c.join(" ")).join(" ");

    switch (geometry.type) {
      case "Point":
        return `<gml:Point srsName="EPSG:4326"><gml:coordinates>${geometry.coordinates.join(
          ","
        )}</gml:coordinates></gml:Point>`;
      case "LineString":
        return `<gml:LineString srsName="EPSG:4326"><gml:coordinates>${geometry.coordinates
          .map((c) => c.join(","))
          .join(" ")}</gml:coordinates></gml:LineString>`;
      case "Polygon":
        // For polygon: list of linear rings
        const rings = geometry.coordinates
          .map(
            (ring) =>
              `<gml:LinearRing><gml:coordinates>${ring
                .map((c) => c.join(","))
                .join(" ")}</gml:coordinates></gml:LinearRing>`
          )
          .join("");
        return `<gml:Polygon srsName="EPSG:4326">${rings}</gml:Polygon>`;
      default:
        console.warn("Unsupported geometry type for GML conversion:", geometry.type);
        return "";
    }
  };

  // Create popup DOM content with editable inputs for each attribute
  const createPopupContent = (feature) => {
  const container = document.createElement("div");
  const title = document.createElement("h4");
  title.textContent = "Edit Attributes";
  container.appendChild(title);
  const localAttributeValues = { ...feature.properties }; // Use local object

  Object.entries(feature.properties || {}).forEach(([key, value]) => {
    const label = document.createElement("label");
    label.textContent = key;
    label.style.display = "block";
    label.style.marginTop = "6px";
    label.style.fontWeight = "bold";

    const input = document.createElement("input");
    input.type = "text";
    input.value = value ?? "";
    input.style.width = "100%";
    input.style.padding = "4px 6px";
    input.style.marginTop = "2px";
    input.style.boxSizing = "border-box";

    input.oninput = (e) => {
      localAttributeValues[key] = e.target.value; // update local object
    };

    container.appendChild(label);
    container.appendChild(input);
  });

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";
  saveBtn.style.marginTop = "10px";
  saveBtn.onclick = () => {
    if (!feature.id) {
      alert("Feature ID not found.");
      return;
    }

    const layerName = editableLayers[0];
    if (!layerName) return;

    const propertiesXml = Object.entries(localAttributeValues).map(
      ([key, value]) => `
        <wfs:Property>
          <wfs:Name>${key}</wfs:Name>
          <wfs:Value>${value}</wfs:Value>
        </wfs:Property>
      `
    ).join("");

    const updateXml = `
      <wfs:Transaction service="WFS" version="1.0.0"
        xmlns:wfs="http://www.opengis.net/wfs"
        xmlns:gml="http://www.opengis.net/gml"
        xmlns:ogc="http://www.opengis.net/ogc"
      >
        <wfs:Update typeName="${layerName}">
          ${propertiesXml}
          <ogc:Filter>
            <ogc:FeatureId fid="${feature.id}" />
          </ogc:Filter>
        </wfs:Update>
      </wfs:Transaction>
    `;

    sendTransaction(updateXml, () => {
      map.closePopup();
      fetchFeatures(layerName);
    });
  };

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.style.marginLeft = "8px";
  cancelBtn.onclick = () => map.closePopup();

  container.appendChild(saveBtn);
  container.appendChild(cancelBtn);

  return container;
};



  // Save edited attributes with WFS-T Update transaction
  const handleAttributeSave = () => {
    const layerName = editableLayers[0];
    if (!layerName || !selectedFeature?.id) return;

    const propertiesXml = Object.entries(attributeValues)
      .map(
        ([key, value]) => `
      <wfs:Property>
        <wfs:Name>${key}</wfs:Name>
        <wfs:Value>${value}</wfs:Value>
      </wfs:Property>
    `
      )
      .join("");

    const updateXml = `
      <wfs:Transaction service="WFS" version="1.0.0"
        xmlns:wfs="http://www.opengis.net/wfs"
        xmlns:gml="http://www.opengis.net/gml"
        xmlns:ogc="http://www.opengis.net/ogc"
        xmlns:ne="http://www.naturalearthdata.com"
      >
        <wfs:Update typeName="${layerName}">
          ${propertiesXml}
          <ogc:Filter>
            <ogc:FeatureId fid="${selectedFeature.id}" />
          </ogc:Filter>
        </wfs:Update>
      </wfs:Transaction>
    `;

    sendTransaction(updateXml, () => {
      fetchFeatures(layerName);
      setSelectedFeature(null);
      setAttributeValues({});
    });
  };

  // Send WFS-T transaction POST request to GeoServer
  const sendTransaction = (xml, callback) => {
    fetch(WFS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml",
      },
      body: xml,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.text();
      })
      .then((text) => {
        console.log("WFS-T transaction response:", text);
        if (callback) callback();
      })
      .catch((err) => {
        console.error("WFS-T transaction error:", err);
        alert("Error performing WFS-T transaction. See console for details.");
      });
  };

  return null; // No visible React UI element; all interaction is on Leaflet map
};

export default WFSLayer;
