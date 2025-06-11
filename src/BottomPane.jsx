import React, { useEffect, useState } from "react";
import L from "leaflet";

const BottomPane = ({ data = [], map, setSelectedFeature }) => {
  //const [selectedFeature, setSelectedFeature] = useState(null);
  const handleSelect = (feature) => {
    setSelectedFeature(feature);
  };
  const recordsPerPage = 20;
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(data.length / recordsPerPage);
  const startIdx = (currentPage - 1) * recordsPerPage;
  const currentRecords = data.slice(startIdx, startIdx + recordsPerPage);

  // Zoom to current page's features
  useEffect(() => {
    
    if (map && currentRecords.length > 0) {
      const group = L.featureGroup(
        currentRecords.map((f) => L.geoJSON(f))
      );
      map.fitBounds(group.getBounds(), { padding: [20, 20] });
    }
  }, [currentPage, currentRecords, map, data]);

  useEffect(() => {
    console.log("BottomPanel received data:", data);
  }, [data]);

  const handlePrev = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNext = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  const handleEdit = (feature) => {
    if (!map) return;
    const layer = L.geoJSON(feature);
    layer.eachLayer((lyr) => {
      lyr.editing?.enable?.(); // Leaflet.Editable or Leaflet.Draw required
      lyr.addTo(map);
    });
    console.log("Editing enabled for feature", feature);
  };

  const handleDelete = (feature) => {
    // Replace with WFS-T or API delete
    console.log("Delete clicked for feature", feature);
    alert("Delete logic not implemented yet.");
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
          </tr>
        </thead>
        <tbody>
          {currentRecords.map((feature, i) => (
            <tr key={i} onClick={() => handleSelect(feature)} style={{ cursor: 'pointer' }}>
              {Object.values(feature.properties).map((val, j) => (
                <td key={j} style={{ border: "1px solid #ccc", padding: "4px" }}>{String(val)}</td>
              ))}

              <td style={{ border: "1px solid #ccc", padding: "4px" }}>
                <button style={{ marginRight: "5px" }} onClick={(e) => { e.stopPropagation(); handleEdit(feature); }}>
                  Edit
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(feature); }}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
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
