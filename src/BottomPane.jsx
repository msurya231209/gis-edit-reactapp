import React, { useEffect, useState } from "react";
import L from "leaflet";

const BottomPanel = ({ data = [], map }) => {
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
  }, [currentPage, currentRecords, map]);

  const handlePrev = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNext = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

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
            <tr key={i}>
              {Object.values(feature.properties).map((val, j) => (
                <td key={j} style={{ border: "1px solid #ccc", padding: "4px" }}>{String(val)}</td>
              ))}
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

export default BottomPanel;
