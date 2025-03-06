import axios from 'axios';

const API_KEY = '49f54774eecb471b98f1afec04a2df6a';

export interface Location {
  lat: number;
  lon: number;
  formatted: string;
}

export interface NearbyPlace {
  name: string;
  location: Location;
  categories: string[];
  openingHours?: string;
  distance?: number;
}

export class MapService {
  // Get user's location from address
  static async getUserLocation(address: string): Promise<Location> {
    const encodedAddress = encodeURIComponent(address);
    const response = await axios.get(
      `https://api.geoapify.com/v1/geocode/search?text=${encodedAddress}&apiKey=${API_KEY}`
    );
    
    const feature = response.data.features[0];
    return {
      lat: feature.properties.lat,
      lon: feature.properties.lon,
      formatted: feature.properties.formatted
    };
  }

  // Get nearby supermarkets
  static async getNearbyPlaces(lat: number, lon: number, radius: number = 10): Promise<NearbyPlace[]> {
    const bbox = this.calculateBoundingBox(lat, lon, radius);
    const response = await axios.get(
      `https://api.geoapify.com/v2/places?categories=commercial.supermarket&filter=rect:${bbox.join(',')}&limit=20&apiKey=${API_KEY}`
    );

    return response.data.features.map((feature: any) => ({
      name: feature.properties.name,
      location: {
        lat: feature.properties.lat,
        lon: feature.properties.lon,
        formatted: feature.properties.formatted
      },
      categories: feature.properties.categories,
      openingHours: feature.properties.opening_hours
    }));
  }

  // Helper to calculate bounding box
  private static calculateBoundingBox(lat: number, lon: number, radius: number): number[] {
    const kmPerDegree = 111.32; // approximate km per degree at equator
    const latDelta = radius / kmPerDegree;
    const lonDelta = radius / (kmPerDegree * Math.cos(lat * Math.PI / 180));
    
    return [
      lon - lonDelta,  // min longitude
      lat - latDelta,  // min latitude
      lon + lonDelta,  // max longitude
      lat + latDelta   // max latitude
    ];
  }
} 