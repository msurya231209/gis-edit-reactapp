import React, { useEffect, useState } from "react";
import { Modal, Button } from "react-bootstrap";
import { FaEdit, FaTrash, FaSave, FaTimes } from "react-icons/fa";
import L from "leaflet";
import "./BottomPane.css";

const BottomPane = ({
  data = [],
  map,
  setSelectedFeature,
  features,
  onEdit,
  onDelete,
  onSaveEdit,
  selectedFeature,
  onDeleteFeature
}) => {
  const [editingFeatureId, setEditingFeatureId] = useState(null);
  const [drawnLayer, setDrawnLayer] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRow, setSelectedRow] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [featureToDelete, setFeatureToDelete] = useState(null);
  const recordsPerPage = 20;
  const totalPages = Math.ceil(data.length / recordsPerPage);
  const startIdx = (currentPage - 1) * recordsPerPage;
  const currentRecords = data.slice(startIdx, startIdx + recordsPerPage);

  const handleSelect = (feature) => {
    setSelectedFeature(feature);
  };

  useEffect(() => {
    if (!map || currentRecords.length === 0) return;

    try {
      const validFeatures = currentRecords.filter(
        (f) => f.geometry && f.geometry.coordinates?.length
      );

      if (validFeatures.length === 0) {
        console.warn("No valid geometries on this page.");
        return;
      }

      const group = L.featureGroup(validFeatures.map((f) => L.geoJSON(f)));
      const bounds = group.getBounds();

      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [20, 20] });
      } else {
        console.warn("Invalid bounds for current page features.");
      }
    } catch (err) {
      console.error("Error computing bounds for page features:", err);
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
      lyr.editing?.enable?.();
      newLayer = lyr;
    });

    setDrawnLayer(newLayer);
    setEditingFeatureId(feature.id);
  };

  const handleDelete = (feature) => {
    setFeatureToDelete(feature);
    setShowConfirm(true);
  };

  const confirmDelete = () => {
    if (featureToDelete) {
      onDeleteFeature(featureToDelete);
      setFeatureToDelete(null);
    }
    setShowConfirm(false);
  };

  const onCancelEdit = () => {
    if (drawnLayer) {
      map.removeLayer(drawnLayer);
    }
    setDrawnLayer(null);
    setEditingFeatureId(null);
    setSelectedFeature(null);
  };

  return (
    <div className="bottom-pane">
      {data.length === 0 ? (
        <div className="empty-message">
          <p><strong>No features to display.</strong></p>
          <p>Please select a WFS layer from the Layer List.</p>
        </div>
      ) : (
        <>
          <h4>Feature Table (Page {currentPage} of {totalPages})</h4>
          <table>
            <thead>
              <tr>
                {Object.keys(data[0].properties).map((key) => (
                  <th key={key}>{key}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentRecords.map((feature, i) => {
                const isEditing = editingFeatureId === feature.id;
                return (
                  <tr
                    key={i}
                    onClick={() => handleSelect(feature)}
                    className={selectedFeature?.id === feature.id ? "selected-row" : ""}
                  >
                    {Object.values(feature.properties).map((val, j) => (
                      <td key={j}>{String(val)}</td>
                    ))}
                    <td className="action-buttons">
                      {!isEditing ? (
                        <>
                          <button
                            className="btn btn-blue"
                            title="Edit"
                            onClick={(e) => { e.stopPropagation(); handleEdit(feature); }}
                          >
                            <FaEdit style={{ marginRight: 5 }} /> Edit
                          </button>
                          <button
                            className="btn btn-red"
                            title="Delete"
                            onClick={(e) => { e.stopPropagation(); handleDelete(feature); }}
                          >
                            <FaTrash style={{ marginRight: 5 }} /> Delete
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="btn btn-green"
                            title="Save"
                            onClick={() => {
                              if (!drawnLayer) return;
                              const updatedGeoJSON = drawnLayer.toGeoJSON();

                              if (!updatedGeoJSON.geometry || !updatedGeoJSON.geometry.coordinates?.length) {
                                alert("Invalid geometry. Cannot save.");
                                return;
                              }

                              const updatedFeature = {
                                ...selectedFeature ?? drawnLayer.feature,
                                geometry: updatedGeoJSON.geometry,
                              };

                              onSaveEdit(updatedFeature);
                              map.removeLayer(drawnLayer);
                              setDrawnLayer(null);
                              setEditingFeatureId(null);
                              setSelectedFeature(null);
                            }}
                          >
                            <FaSave style={{ marginRight: 5 }} /> Save
                          </button>
                          <button
                            className="btn btn-gray"
                            title="Cancel"
                            onClick={(e) => { e.stopPropagation(); onCancelEdit(); }}
                          >
                            <FaTimes style={{ marginRight: 5 }} /> Cancel
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="pagination">
            <button onClick={handlePrev} disabled={currentPage === 1}>Prev</button>
            <span>Page {currentPage} of {totalPages}</span>
            <button onClick={handleNext} disabled={currentPage === totalPages}>Next</button>
          </div>
        </>
      )}
      {/* Delete Confirmation Modal */}
      <Modal show={showConfirm} onHide={() => setShowConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Deletion</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete this feature? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirm(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default BottomPane;
