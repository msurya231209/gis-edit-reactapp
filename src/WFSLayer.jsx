import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";

const WFS_URL = "http://localhost:8080/geoserver/ne/ows";

const WFSLayer = forwardRef(({ editableLayers, onFeaturesUpdate }, ref) => {
  const map = useMap();
  const drawnItems = useRef(new L.FeatureGroup());
  const popupRef = useRef(null);

  // Selected feature and its editable attribute values
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [attributeValues, setAttributeValues] = useState({});

  // Handle edits (geometry or attributes) - update WFS-T
    const handleEdit = (feature) => {
      console.log("WFSLayer: handleEdit called with feature", feature);
      if (!feature?.id) return;

      const layerName = editableLayers[0]?.name;

      const gml = gmlFromGeometry(feature.geometry);
      console.log("Sending GML Geometry:", gml);
      const propertiesXml = Object.entries(feature.properties || {})
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
        >
          <wfs:Update typeName="${layerName}">
            <wfs:Property>
              <wfs:Name>geom</wfs:Name>
              <wfs:Value>${gml}</wfs:Value>
            </wfs:Property>
            ${propertiesXml}
            <ogc:Filter>
              <ogc:FeatureId fid="${feature.id}" />
            </ogc:Filter>
          </wfs:Update>
        </wfs:Transaction>
      `;

      sendTransaction(updateXml, () => {
        console.log(`Feature ${feature.id} updated`);
        fetchFeatures(layerName);
        setSelectedFeature(null);
        setAttributeValues({});
      });
    };

    // Handle deletion - delete WFS-T
    const handleDelete = (feature) => {
      const layerName = editableLayers[0]?.name;

      if (!layerName || !feature?.id) {
        console.warn("Cannot delete: layer or feature id missing");
        return;
      }

      const deleteXml = `
        <wfs:Transaction service="WFS" version="1.0.0"
          xmlns:wfs="http://www.opengis.net/wfs"
          xmlns:ogc="http://www.opengis.net/ogc"
        >
          <wfs:Delete typeName="${layerName}">
            <ogc:Filter>
              <ogc:FeatureId fid="${feature.id}" />
            </ogc:Filter>
          </wfs:Delete>
        </wfs:Transaction>
      `;

      sendTransaction(deleteXml, () => {
        console.log(`✅ Feature ${feature.id} deleted`);
        fetchFeatures(layerName);
      });
    };

  useImperativeHandle(ref, () => ({
    handleEdit,
    handleDelete
  }));
  useEffect(() => {
    map.addLayer(drawnItems.current);

    const drawControl = new L.Control.Draw({
      edit: false,
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

      const layerName = editableLayers[0]?.name;

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
            <${layerName.split(":")[1]}>
              <ne:geom>
                ${gml}
              </ne:geom>
              <ne:name>New Feature</ne:name>
            </${layerName.split(":")[1]}>
          </wfs:Insert>
        </wfs:Transaction>
      `;

      sendTransaction(insertXml, () => fetchFeatures(layerName));
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
  const lastFetchedLayer = useRef(null);

  useEffect(() => {
    if (!map || editableLayers.length === 0) return;

    const layerName = editableLayers[0]?.name;
    if (!layerName || layerName === lastFetchedLayer.current) return;

    console.log("📡 Fetching WFS for layer:", layerName);
    fetchFeatures(layerName);
    lastFetchedLayer.current = layerName;
  }, [map, editableLayers]);

  const fetchFeatures = (typeName) => {
  fetch(
    `${WFS_URL}?service=WFS&version=1.0.0&request=GetFeature&typeName=${typeName}&outputFormat=application/json`
  )
    .then(async (res) => {
      const text = await res.text(); // Read as text first
      const contentType = res.headers.get("content-type") || "";

      if (!res.ok) {
        console.error("WFS request failed:", res.status);
        throw new Error(`WFS request failed with status ${res.status}`);
      }

      if (!contentType.includes("application/json")) {
        console.error("Expected JSON response but got:", contentType);
        console.error("Response content:\n", text);
        throw new Error("Server did not return JSON. Possibly an XML error.");
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        console.error("WFS fetch error: invalid JSON. Raw response:\n", text);
        throw new Error("Failed to parse WFS JSON response");
      }

      console.log("WFS GeoJSON data", data);
      drawnItems.current.clearLayers();
      const features = data.features;

      if (onFeaturesUpdate) onFeaturesUpdate(features);

      L.geoJSON(data, {
        onEachFeature: (feature, layer) => {
          layer.feature = feature;

          // Assign ID if missing
          if (!feature.id && feature.properties && feature.properties.id) {
            feature.id = feature.properties.id;
          }

          layer.on("click", () => {
            setSelectedFeature(feature);
            setAttributeValues({ ...feature.properties });

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
    })
    .catch((err) => {
      console.error("WFS fetch error:", err.message);
    });
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
      case "MultiLineString":
        return `
          <gml:MultiLineString srsName="EPSG:4326">
            ${geometry.coordinates
              .map(
                (line) => `
              <gml:lineStringMember>
                <gml:LineString>
                  <gml:coordinates>${line.map((c) => c.join(",")).join(" ")}</gml:coordinates>
                </gml:LineString>
              </gml:lineStringMember>
            `
              )
              .join("")}
          </gml:MultiLineString>
        `;
      case "Polygon":
        // For polygon: list of linear rings
        const outerRing = geometry.coordinates[0];
        const gmlCoords = outerRing.map((c) => c.join(",")).join(" ");

        return `
          <gml:Polygon srsName="EPSG:4326">
            <gml:outerBoundaryIs>
              <gml:LinearRing>
                <gml:coordinates>${gmlCoords}</gml:coordinates>
              </gml:LinearRing>
            </gml:outerBoundaryIs>
          </gml:Polygon>
        `;
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

    const layerName = editableLayers[0]?.name;

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
    const layerName = editableLayers[0]?.name;

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
});

export default WFSLayer;
