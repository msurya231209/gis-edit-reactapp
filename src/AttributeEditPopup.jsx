import React, { useState, useEffect } from 'react';

const AttributeEditPopup = ({ feature, initialAttributes, onSave, onCancel }) => {
  const [attributes, setAttributes] = useState(initialAttributes);

  useEffect(() => {
    setAttributes(initialAttributes);
  }, [initialAttributes]);

  const handleChange = (key, value) => {
    setAttributes(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveClick = () => {
    onSave(attributes);
  };

  return (
    <div style={{ maxWidth: '300px' }}>
      <h4>Edit Attributes</h4>
      {Object.entries(attributes).map(([key, value]) => (
        <div key={key} style={{ marginBottom: '8px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>{key}</label>
          <input
            type="text"
            value={value ?? ''}
            onChange={e => handleChange(key, e.target.value)}
            style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
          />
        </div>
      ))}
      <div style={{ textAlign: 'right' }}>
        <button onClick={handleSaveClick} style={{ marginRight: '8px' }}>Save</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
};

export default AttributeEditPopup;
