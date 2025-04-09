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

.location-permission {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  text-align: center;
  background-color: #f5f5f5;
}

.location-permission h2 {
  color: #333;
  margin-bottom: 20px;
  font-size: 24px;
}

.location-permission p {
  color: #666;
  margin-bottom: 10px;
  font-size: 16px;
  max-width: 500px;
}

.location-button {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  margin-top: 20px;
  transition: background-color 0.3s;
}

.location-button:hover {
  background-color: #45a049;
}

.error-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  text-align: center;
  background-color: #f5f5f5;
}

.error-message h2 {
  color: #333;
  margin-bottom: 20px;
  font-size: 24px;
}

.error-message p {
  color: #666;
  margin-bottom: 10px;
  font-size: 16px;
  max-width: 500px;
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
    const popupRefs = useRef<maplibregl.Popup[]>([]);
    const activePopupIndex = useRef<number | null>(null);

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

        // Clear existing popups array
        popupRefs.current = [];

        // Add user location marker
        const userPopup = new maplibregl.Popup({ closeOnClick: false, closeButton: true })
            .setHTML('Your Location');
        
        new maplibregl.Marker({ color: '#FF0000' })
            .setLngLat(center)
            .setPopup(userPopup)
            .addTo(map);

        // Add place markers
        markers.forEach((marker, index) => {
            // Create popup but don't attach it yet
            const popup = new maplibregl.Popup({ 
                closeOnClick: false,
                closeButton: true 
            }).setHTML(marker.title);
            
            // Store the popup in our refs array
            popupRefs.current.push(popup);

            // Create marker without popup
            const markerElement = new maplibregl.Marker({ color: '#4CAF50' })
                .setLngLat(marker.position)
                .addTo(map);

            // Add click listener to marker
            markerElement.getElement().addEventListener('click', () => {
                // Close any open popup
                if (activePopupIndex.current !== null && activePopupIndex.current !== index) {
                    popupRefs.current[activePopupIndex.current].remove();
                }
                
                // Set the new active popup
                activePopupIndex.current = index;
                
                // Show the popup for this marker
                popup.setLngLat(marker.position).addTo(map);
                
                // Call the callback
                onMarkerClick(index);
            });
            
            // Add close handler to the popup to reset active index when closed
            popup.on('close', () => {
                if (activePopupIndex.current === index) {
                    activePopupIndex.current = null;
                }
            });
        });

        return () => {
            // Clean up all popups
            popupRefs.current.forEach(popup => popup.remove());
            map.remove();
        };
    }, [center, markers, zoom, onMarkerClick]);

    return <div ref={mapContainer} className="map-container" />;
};

const App: React.FC = () => {
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [places, setPlaces] = useState<Place[]>([]);
    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [accuracy, setAccuracy] = useState<number | null>(null);
    const [showLocationPermission, setShowLocationPermission] = useState(false);
    const [permissionState, setPermissionState] = useState<PermissionState | null>(null);
    const [isGPSEnabled, setIsGPSEnabled] = useState<boolean | null>(null);
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

    // Function to check if GPS is enabled
    const checkGPSStatus = async (position: GeolocationPosition | null = null): Promise<boolean> => {
        if (position) {
            // If we got a position, GPS must be enabled
            setIsGPSEnabled(true);
            return true;
        }

        // Try to get a high-accuracy position with a short timeout
        return new Promise<boolean>((resolve) => {
            navigator.geolocation.getCurrentPosition(
                () => {
                    setIsGPSEnabled(true);
                    resolve(true);
                },
                (error) => {
                    // If error is TIMEOUT or POSITION_UNAVAILABLE, GPS might be disabled
                    const isGPSDisabled = error.code === error.TIMEOUT || 
                                        error.code === error.POSITION_UNAVAILABLE;
                    setIsGPSEnabled(!isGPSDisabled);
                    resolve(!isGPSDisabled);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 2000, // Short timeout to quickly detect GPS status
                    maximumAge: 0
                }
            );
        });
    };

    // Function to check location permission
    const checkLocationPermission = async () => {
        try {
            const permission = await navigator.permissions.query({ name: 'geolocation' });
            setPermissionState(permission.state);
            
            switch (permission.state) {
                case 'granted':
                    // Check GPS status before starting tracking
                    const gpsEnabled = await checkGPSStatus();
                    if (gpsEnabled) {
                        startLocationTracking();
                    } else {
                        setLocationError(
                            "GPS is disabled. To use this app:\n\n" +
                            "1. Pull down from the top of your screen\n" +
                            "2. Tap the Location/GPS icon to turn it on\n" +
                            "3. Make sure it's set to 'High accuracy' mode\n" +
                            "4. Tap 'Try Again' below"
                        );
                    }
                    break;
                case 'prompt':
                    setShowLocationPermission(true);
                    break;
                case 'denied':
                    setLocationError(
                        "Location access is blocked. To enable:\n\n" +
                        "1. Open your browser settings\n" +
                        "2. Go to Site Settings > Location\n" +
                        "3. Allow location access\n" +
                        "4. Refresh this page"
                    );
                    break;
            }

            // Listen for permission changes
            permission.addEventListener('change', async () => {
                setPermissionState(permission.state);
                if (permission.state === 'granted') {
                    const gpsEnabled = await checkGPSStatus();
                    if (gpsEnabled) {
                        startLocationTracking();
                    }
                }
            });
        } catch (error) {
            console.error('Error checking permission:', error);
            if (navigator.geolocation) {
                setShowLocationPermission(true);
            } else {
                setLocationError("Geolocation is not supported by your browser.");
            }
        }
    };

    // Function to force location permission request
    const requestLocationPermission = () => {
        setIsLoading(true);
        if (!navigator.geolocation) {
            setLocationError("Geolocation is not supported by your browser.");
            setIsLoading(false);
            return;
        }

        // Request position once to trigger the permission prompt
        navigator.geolocation.getCurrentPosition(
            (position) => {
                // Successfully got location, start tracking
                handleLocationSuccess(position);
                setShowLocationPermission(false);
                startLocationTracking();
            },
            (error) => {
                handleLocationError(error);
                // Only show permission screen if we need to prompt
                setShowLocationPermission(permissionState === 'prompt');
            },
            { 
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    };

    // Function to start location tracking
    const startLocationTracking = () => {
        setIsLoading(true);
        setLocationError(null);

        // Clear any existing watch
        if (watchId.current !== null) {
            navigator.geolocation.clearWatch(watchId.current);
        }

        watchId.current = navigator.geolocation.watchPosition(
            handleLocationSuccess,
            handleLocationError,
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    };

    // Function to handle successful location updates
    const handleLocationSuccess = (position: GeolocationPosition) => {
        const { latitude, longitude, accuracy } = position.coords;
        setAccuracy(accuracy);
        setShowLocationPermission(false);
        setUserLocation([longitude, latitude]);
        setIsLoading(false);
        fetchNearbyPlaces(longitude, latitude);
    };

    // Function to handle location errors
    const handleLocationError = (err: GeolocationPositionError) => {
        setIsLoading(false);
        let errorMessage = "";
        
        switch(err.code) {
            case err.PERMISSION_DENIED:
                errorMessage = "Location access is blocked. To enable:\n\n" +
                             "1. Tap the location icon (🌍) in your browser's address bar\n" +
                             "2. Select 'Allow'\n" +
                             "3. Refresh this page";
                setPermissionState('denied');
                break;
            case err.POSITION_UNAVAILABLE:
                errorMessage = "Cannot find your location. Please:\n\n" +
                             "1. Pull down from the top of your screen\n" +
                             "2. Turn on Location/GPS\n" +
                             "3. Set it to 'High accuracy' mode\n" +
                             "4. Check that you're not in airplane mode\n" +
                             "5. Make sure you have a clear view of the sky";
                setIsGPSEnabled(false);
                break;
            case err.TIMEOUT:
                errorMessage = "Location request timed out. Please:\n\n" +
                             "1. Check your internet connection\n" +
                             "2. Make sure GPS is enabled and in 'High accuracy' mode\n" +
                             "3. Move to an area with better GPS signal";
                break;
            default:
                errorMessage = "An error occurred getting your location. Please check your device settings and try again.";
        }
        
        setLocationError(errorMessage);
    };

    useEffect(() => {
        // Check permission status first
        checkLocationPermission();

        return () => {
            if (watchId.current !== null) {
                navigator.geolocation.clearWatch(watchId.current);
            }
        };
    }, []);

    // Location permission request state
    if (showLocationPermission || (locationError && permissionState !== 'denied')) {
        return (
            <div className="location-permission">
                <h2>{isGPSEnabled === false ? 'GPS is Disabled' : 'Enable Location Access'}</h2>
                {locationError ? (
                    <>
                        <p style={{ color: '#d32f2f', whiteSpace: 'pre-line' }}>{locationError}</p>
                        <button 
                            onClick={() => {
                                setLocationError(null);
                                checkLocationPermission();
                            }}
                            className="location-button"
                            style={{ marginTop: '20px' }}
                        >
                            Try Again
                        </button>
                    </>
                ) : (
                    <>
                        <p>To find tourist places near you:</p>
                        <ol style={{ textAlign: 'left', marginBottom: '20px' }}>
                            <li>Make sure GPS is enabled (pull down from top of screen)</li>
                            <li>Tap the button below</li>
                            <li>Allow location access when prompted</li>
                            <li>Wait while we find places near you</li>
                        </ol>
                        <button 
                            onClick={requestLocationPermission}
                            className="location-button"
                        >
                            Find Places Near Me
                        </button>
                    </>
                )}
            </div>
        );
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="loading">
                <div className="loading-spinner"></div>
                <p>Finding places near you...</p>
                {accuracy && (
                    <p>GPS Accuracy: {accuracy.toFixed(1)} meters</p>
                )}
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
        <>
            <style>{styles}</style>
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
        </>
    );
};

export default App; 