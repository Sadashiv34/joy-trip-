import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// Add styles directly in the component
const styles = `
/* Global styles */
:root {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;
}

body {
  margin: 0;
  padding: 20px;
  min-height: 100vh;
  background-color: #f5f5f5;
}

/* Map styles */
.map-container {
  width: 100%;
  height: 70vh;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 20px;
}

/* Place list styles */
.place-list {
  margin-top: 20px;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;
}

.place-item {
  padding: 10px;
  margin: 5px 0;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  border-left: 4px solid transparent;
}

.place-item:hover {
  background: #f0f0f0;
  transform: translateX(5px);
}

.place-item.selected {
  background: #e8f5e9;
  border-left-color: #4CAF50;
}

.place-item h3 {
  margin: 0 0 8px 0;
  color: #333;
}

.place-item p {
  margin: 4px 0;
  color: #666;
  font-size: 14px;
}

/* Selected place styles */
.selected-place {
  margin: 20px 0;
  padding: 15px;
  background: #e8f5e9;
  border-radius: 4px;
  border-left: 4px solid #4CAF50;
}

.selected-place h2 {
  margin: 0 0 10px 0;
  color: #2e7d32;
}

.selected-place p {
  margin: 8px 0;
  color: #333;
}

.selected-place a {
  display: inline-block;
  margin-top: 10px;
  padding: 8px 16px;
  background: #4CAF50;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.selected-place a:hover {
  background: #388e3c;
}

/* Loading state */
.loading {
  text-align: center;
  padding: 20px;
  font-size: 16px;
  color: #666;
}
`;

// Add style tag to document
const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

const GEOAPIFY_API_KEY = '49f54774eecb471b98f1afec04a2df6a';

interface Place {
    name: string;
    location: {
        lat: number;
        lon: number;
        formatted: string;
    };
    description?: string;
    categories?: string[];
    website?: string;
    distance?: number;
}

interface MapProps {
    center: [number, number];
    markers?: Array<{
        position: [number, number];
        title: string;
    }>;
    zoom?: number;
    onMarkerClick: (index: number) => void;
}

const Map: React.FC<MapProps> = ({ center, markers = [], zoom = 13, onMarkerClick }) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<maplibregl.Map | null>(null);

    useEffect(() => {
        if (!mapContainer.current || !center) return;

        const map = new maplibregl.Map({
            container: mapContainer.current,
            style: {
                version: 8,
                sources: {
                    'raster-tiles': {
                        type: 'raster',
                        tiles: [`https://maps.geoapify.com/v1/tile/carto/{z}/{x}/{y}.png?apiKey=${GEOAPIFY_API_KEY}`],
                        tileSize: 256,
                    }
                },
                layers: [{
                    id: 'raster-tiles',
                    type: 'raster',
                    source: 'raster-tiles',
                    minzoom: 0,
                    maxzoom: 20
                }]
            },
            center: center,
            zoom: zoom
        });

        mapInstance.current = map;

        // Add user location marker
        new maplibregl.Marker({ color: '#FF0000' })
            .setLngLat(center)
            .setPopup(new maplibregl.Popup().setHTML('Your Location'))
            .addTo(map);

        // Add place markers
        markers.forEach((marker, index) => {
            const markerElement = new maplibregl.Marker({ color: '#4CAF50' })
                .setLngLat(marker.position)
                .setPopup(new maplibregl.Popup().setHTML(marker.title))
                .addTo(map);

            markerElement.getElement().addEventListener('click', () => {
                onMarkerClick(index);
            });
        });

        return () => map.remove();
    }, [center, markers, zoom, onMarkerClick]);

    return <div ref={mapContainer} className="map-container" />;
};

const App: React.FC = () => {
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [places, setPlaces] = useState<Place[]>([]);
    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

    useEffect(() => {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation([longitude, latitude]);

            const bbox = [
                longitude - 0.1,
                latitude - 0.1,
                longitude + 0.1,
                latitude + 0.1
            ];

            try {
                const response = await axios.get(
                    `https://api.geoapify.com/v2/places?categories=tourism.sights&filter=rect:${bbox.join(',')}&limit=20&apiKey=${GEOAPIFY_API_KEY}`
                );

                const touristPlaces = response.data.features.map((feature: any) => ({
                    name: feature.properties.name,
                    location: {
                        lat: feature.properties.lat,
                        lon: feature.properties.lon,
                        formatted: feature.properties.formatted
                    },
                    description: feature.properties.description,
                    categories: feature.properties.categories,
                    website: feature.properties.website,
                    distance: feature.properties.distance
                }));

                setPlaces(touristPlaces);
            } catch (error) {
                console.error('Error fetching places:', error);
            }
        });
    }, []);

    if (!userLocation) {
        return <div className="loading">Loading... Please enable location services.</div>;
    }

    const markers = places.map(place => ({
        position: [place.location.lon, place.location.lat] as [number, number],
        title: place.name
    }));

    return (
        <div>
            <h1>Nearby Tourist Places</h1>
            <Map 
                center={userLocation} 
                markers={markers} 
                zoom={13}
                onMarkerClick={(index) => setSelectedPlace(places[index])}
            />
            {selectedPlace && (
                <div className="selected-place">
                    <h2>{selectedPlace.name}</h2>
                    <p>{selectedPlace.location.formatted}</p>
                    {selectedPlace.description && <p>{selectedPlace.description}</p>}
                    {selectedPlace.website && (
                        <a href={selectedPlace.website} target="_blank" rel="noopener noreferrer">
                            Visit Website
                        </a>
                    )}
                </div>
            )}
            <div className="place-list">
                {places.map((place, index) => (
                    <div 
                        key={index} 
                        className={`place-item ${selectedPlace?.name === place.name ? 'selected' : ''}`}
                        onClick={() => setSelectedPlace(place)}
                    >
                        <h3>{place.name}</h3>
                        <p>{place.location.formatted}</p>
                        <p>Distance: {place.distance ? `${(place.distance / 1000).toFixed(1)} km` : 'N/A'}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default App; 