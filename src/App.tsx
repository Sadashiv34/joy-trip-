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
const MIN_ACCURACY_METERS = 100; // Only accept locations with accuracy better than 100 meters

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
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [accuracy, setAccuracy] = useState<number | null>(null);
    const watchId = useRef<number | null>(null);

    const fetchNearbyPlaces = async (longitude: number, latitude: number) => {
        try {
            const bbox = [
                longitude - 0.02, // Reduced radius for more precise results
                latitude - 0.02,
                longitude + 0.02,
                latitude + 0.02
            ];

            const response = await axios.get(
                `https://api.geoapify.com/v2/places`,
                {
                    params: {
                        categories: 'tourism.sights',
                        filter: `rect:${bbox.join(',')}`,
                        limit: 20,
                        apiKey: GEOAPIFY_API_KEY
                    }
                }
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
            setLocationError('Failed to fetch nearby places. Please try again.');
        }
    };

    useEffect(() => {
        // Function to handle successful location updates
        const handleLocationSuccess = (position: GeolocationPosition) => {
            const { latitude, longitude, accuracy } = position.coords;
            console.log('Location update received:', { latitude, longitude, accuracy });
            setAccuracy(accuracy);

            // Only update location if accuracy is good enough
            if (accuracy <= MIN_ACCURACY_METERS) {
                console.log('Good accuracy, updating location');
                setUserLocation([longitude, latitude]);
                setIsLoading(false);
                fetchNearbyPlaces(longitude, latitude);
            } else {
                console.log('Poor accuracy, waiting for better reading');
                // Don't set error yet, keep waiting for better accuracy
            }
        };

        // Function to handle location errors
        const handleLocationError = (err: GeolocationPositionError) => {
            setIsLoading(false);
            let errorMessage = "An unknown error occurred while getting your location.";
            
            switch(err.code) {
                case err.PERMISSION_DENIED:
                    errorMessage = "Please enable location services in your browser settings to use this app.";
                    break;
                case err.POSITION_UNAVAILABLE:
                    errorMessage = "Unable to determine your location. Please check your device's GPS settings.";
                    break;
                case err.TIMEOUT:
                    errorMessage = "Location request timed out. Please check your internet connection and GPS signal.";
                    break;
            }
            
            setLocationError(errorMessage);
            console.error('Geolocation error:', err);
        };

        // Options for location watching
        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };

        // Start watching position
        if (navigator.geolocation) {
            // Get initial position
            navigator.geolocation.getCurrentPosition(handleLocationSuccess, handleLocationError, options);
            
            // Then start watching for updates
            watchId.current = navigator.geolocation.watchPosition(
                handleLocationSuccess,
                handleLocationError,
                options
            );
        } else {
            setLocationError("Geolocation is not supported by your browser.");
            setIsLoading(false);
        }

        // Cleanup function
        return () => {
            if (watchId.current !== null) {
                navigator.geolocation.clearWatch(watchId.current);
            }
            setUserLocation(null);
            setPlaces([]);
            setSelectedPlace(null);
        };
    }, []);

    // Loading state
    if (isLoading) {
        return (
            <div className="loading">
                <div className="loading-spinner"></div>
                <p>Getting your location...</p>
                {accuracy && (
                    <p>Current accuracy: {accuracy.toFixed(1)} meters</p>
                )}
            </div>
        );
    }

    // Error state
    if (locationError) {
        return (
            <div className="error-message">
                <p>{locationError}</p>
                <button 
                    onClick={() => window.location.reload()} 
                    className="retry-button"
                >
                    Try Again
                </button>
            </div>
        );
    }

    // No location state
    if (!userLocation) {
        return (
            <div className="loading">
                <p>Waiting for accurate location data...</p>
                {accuracy && (
                    <p>Current accuracy: {accuracy.toFixed(1)} meters</p>
                )}
            </div>
        );
    }

    const markers = places.map(place => ({
        position: [place.location.lon, place.location.lat] as [number, number],
        title: place.name
    }));

    return (
        <div>
            <h1>Nearby Tourist Places</h1>
            {accuracy && (
                <div className="accuracy-info">
                    Location accuracy: {accuracy.toFixed(1)} meters
                </div>
            )}
            <Map 
                center={userLocation} 
                markers={markers} 
                zoom={14}  // Increased zoom level for better precision
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
                {places.length === 0 ? (
                    <p>No tourist places found nearby. Try moving to a different location.</p>
                ) : (
                    places.map((place, index) => (
                        <div 
                            key={index} 
                            className={`place-item ${selectedPlace?.name === place.name ? 'selected' : ''}`}
                            onClick={() => setSelectedPlace(place)}
                        >
                            <h3>{place.name}</h3>
                            <p>{place.location.formatted}</p>
                            <p>Distance: {place.distance ? `${(place.distance / 1000).toFixed(1)} km` : 'N/A'}</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default App; 