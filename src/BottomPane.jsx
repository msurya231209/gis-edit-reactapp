import React, { useEffect, useState } from "react";
import L from "leaflet";

const BottomPane = ({ data = [], map, setSelectedFeature, features, onEdit, onDelete, onSaveEdit, selectedFeature }) => {
  const [editingFeatureId, setEditingFeatureId] = useState(null);
  const [drawnLayer, setDrawnLayer] = useState(null);

  const handleSelect = (feature) => {
    setSelectedFeature(feature);
  };

  const recordsPerPage = 20;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(data.length / recordsPerPage);
  const startIdx = (currentPage - 1) * recordsPerPage;
  const currentRecords = data.slice(startIdx, startIdx + recordsPerPage);

  useEffect(() => {
    if (map && currentRecords.length > 0) {
      const group = L.featureGroup(currentRecords.map((f) => L.geoJSON(f)));
      map.fitBounds(group.getBounds(), { padding: [20, 20] });
    }
  }, [currentPage, currentRecords, map]);

  const handlePrev = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNext = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  const handleEdit = (feature) => {
    if (!map) return;

    if (drawnLayer) {
      map.removeLayer(drawnLayer);
    }

    const layer = L.geoJSON(feature);
    let newLayer = null;

    layer.eachLayer((lyr) => {
      lyr.addTo(map);
      lyr.editing?.enable?.(); // Leaflet.Editable or Draw
      newLayer = lyr;
    });

    setDrawnLayer(newLayer);
    setEditingFeatureId(feature.id);
    console.log("Editing enabled for feature", feature);
  };

  const handleDelete = (feature) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this feature?");
    if (confirmDelete) {
      onDelete(feature);
    }
  };

  const onCancelEdit = () => {
    if (drawnLayer) {
      map.removeLayer(drawnLayer);
    }
    setDrawnLayer(null);
    setEditingFeatureId(null);
    console.log("Edit cancelled");
  };

  return (
    <div style={{ padding: "10px", background: "#f0f0f0", maxHeight: "255px", overflowY: "auto" }}>
      <h4>Feature Table (Page {currentPage} of {totalPages})</h4>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {data.length > 0 &&
              Object.keys(data[0].properties).map((key) => (
                <th key={key} style={{ border: "1px solid #ccc", padding: "4px" }}>{key}</th>
              ))}
            <th style={{ border: "1px solid #ccc", padding: "4px" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentRecords.map((feature, i) => {
            const isEditing = editingFeatureId === feature.id;

            return (
              <tr key={i} onClick={() => handleSelect(feature)} style={{ cursor: 'pointer' }}>
                {Object.values(feature.properties).map((val, j) => (
                  <td key={j} style={{ border: "1px solid #ccc", padding: "4px" }}>{String(val)}</td>
                ))}
                <td style={{ border: "1px solid #ccc", padding: "4px" }}>
                  {!isEditing ? (
                    <>
                      <button className="edit-btn" onClick={(e) => { e.stopPropagation(); handleEdit(feature); }}>Edit</button>
                      <button className="delete-btn" onClick={(e) => { e.stopPropagation(); handleDelete(feature); }}>Delete</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => {
                        if (!drawnLayer) {
                          alert("No geometry drawn.");
                          return;
                        }

                        const updatedGeoJSON = drawnLayer.toGeoJSON();
                        const newGeometry = updatedGeoJSON.geometry;

                        // Validate geometry
                        if (!newGeometry || !newGeometry.coordinates || newGeometry.coordinates.length === 0) {
                          alert("Invalid geometry. Cannot save.");
                          return;
                        }

                        // Try getting feature info from drawnLayer.feature if selectedFeature is not present
                        const baseFeature = selectedFeature ?? drawnLayer.feature;
                        if (!baseFeature) {
                          alert("No base feature to update.");
                          return;
                        }

                        const updatedFeature = {
                          ...baseFeature,
                          geometry: newGeometry,
                        };

                        console.log("✅ Saving updated feature:", updatedFeature);

                        onSaveEdit(updatedFeature);
                        map.removeLayer(drawnLayer);
                        setDrawnLayer(null);
                        setEditingFeatureId(null);
                        setSelectedFeature(null);
                      }}>Save</button>
                      <button className="cancel-btn" onClick={(e) => { e.stopPropagation(); onCancelEdit(); }}>Cancel</button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ marginTop: "10px" }}>
        <button onClick={handlePrev} disabled={currentPage === 1}>Prev</button>
        <span style={{ margin: "0 10px" }}>Page {currentPage}</span>
        <button onClick={handleNext} disabled={currentPage === totalPages}>Next</button>
      </div>
    </div>
  );
};

export default BottomPane;
