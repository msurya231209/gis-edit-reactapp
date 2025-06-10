// FeatureTable.jsx
import React from 'react';
import Table from 'react-bootstrap/Table';
import Pagination from 'react-bootstrap/Pagination';

const PAGE_SIZE = 100;

export default function FeatureTable({ features, currentPage, onPageChange }) {
  const totalPages = Math.ceil(features.length / PAGE_SIZE);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageFeatures = features.slice(start, start + PAGE_SIZE);

  return (
    <div>
      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
        <Table striped bordered size="sm">
          <thead>
            <tr>
              <th>#</th>
              <th>ID</th>
              {/* Add more columns as needed */}
            </tr>
          </thead>
          <tbody>
            {pageFeatures.map((feature, idx) => (
              <tr key={feature.id || idx}>
                <td>{start + idx + 1}</td>
                <td>{feature.id}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      <Pagination>
        {[...Array(totalPages)].map((_, i) => (
          <Pagination.Item
            key={i}
            active={i + 1 === currentPage}
            onClick={() => onPageChange(i + 1)}
          >
            {i + 1}
          </Pagination.Item>
        ))}
      </Pagination>
    </div>
  );
}
