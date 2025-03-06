import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

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

export const NearbyPlaces: React.FC = () => {
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
        return <div>Loading... Please enable location services.</div>;
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

export default NearbyPlaces; 