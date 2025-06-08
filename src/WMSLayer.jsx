import React, { useRef, useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const WMSLayer = () => {
  const map = useMap();

  useEffect(() => {
    const wmsLayer = L.tileLayer.wms('http://localhost:8080/geoserver/ne/wms', {
      layers: ['ne:IND_adm1','ne:TGAdminBoundares3'], // change to your layer name
      format: 'image/png',
      transparent: true,
      version: '1.1.1',
      attribution: 'GeoServer WMS'
    });

    wmsLayer.addTo(map);

    return () => {
      map.removeLayer(wmsLayer);
    };
  }, [map]);

  return null;
};

export default WMSLayer;