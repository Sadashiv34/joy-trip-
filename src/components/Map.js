const Map = ({ center, markers = [], zoom = 13 }) => {
    const mapContainer = React.useRef(null);
    const map = React.useRef(null);

    React.useEffect(() => {
        if (!mapContainer.current) return;

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: `https://maps.geoapify.com/v1/tile/carto/{z}/{x}/{y}.png?apiKey=49f54774eecb471b98f1afec04a2df6a`,
            center: center,
            zoom: zoom
        });

        markers.forEach(marker => {
            new maplibregl.Marker()
                .setLngLat(marker.position)
                .setPopup(new maplibregl.Popup().setHTML(marker.title))
                .addTo(map.current);
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