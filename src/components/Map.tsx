import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MapProps {
  center: [number, number];
  markers?: Array<{
    position: [number, number];
    title: string;
  }>;
  zoom?: number;
}

const Map: React.FC<MapProps> = ({ center, markers = [], zoom = 13 }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: `https://maps.geoapify.com/v1/tile/carto/{z}/{x}/{y}.png?apiKey=49f54774eecb471b98f1afec04a2df6a`,
      center: center,
      zoom: zoom
    });

    // Add markers
    markers.forEach(marker => {
      new maplibregl.Marker()
        .setLngLat(marker.position)
        .setPopup(new maplibregl.Popup().setHTML(marker.title))
        .addTo(map.current!);
    });

    return () => {
      map.current?.remove();
    };
  }, [center, markers, zoom]);

  return (
    <div 
      ref={mapContainer} 
      style={{ width: '100%', height: '500px' }}
    />
  );
};

export default Map; 