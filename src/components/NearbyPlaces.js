const NearbyPlaces = ({ address }) => {
    const [userLocation, setUserLocation] = React.useState(null);
    const [places, setPlaces] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    React.useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const location = await MapService.getUserLocation(address);
                setUserLocation([location.lon, location.lat]);
                
                const nearbyPlaces = await MapService.getNearbyPlaces(location.lat, location.lon);
                setPlaces(nearbyPlaces);
            } catch (err) {
                setError('Failed to load locations');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [address]);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>{error}</div>;
    if (!userLocation) return <div>Location not found</div>;

    const markers = places.map(place => ({
        position: [place.location.lon, place.location.lat],
        title: place.name
    }));

    return (
        <div>
            <Map 
                center={userLocation}
                markers={markers}
            />
            <div className="places-list">
                {places.map((place, index) => (
                    <div key={index} className="place-item">
                        <h3>{place.name}</h3>
                        <p>{place.location.formatted}</p>
                        {place.openingHours && <p>Open: {place.openingHours}</p>}
                    </div>
                ))}
            </div>
        </div>
    );
}; 