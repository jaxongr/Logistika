import Geolocation from 'react-native-geolocation-service';
import { PermissionsAndroid, Platform, Alert } from 'react-native';
import { ApiService } from './ApiService';
import { SocketService } from './SocketService';

export interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

class LocationServiceClass {
  private watchId: number | null = null;
  private driverId: string | null = null;
  private isTracking = false;
  private lastLocation: Location | null = null;
  private locationUpdateInterval: NodeJS.Timeout | null = null;

  // Configuration
  private readonly UPDATE_INTERVAL = 30000; // 30 seconds
  private readonly MIN_DISTANCE_THRESHOLD = 50; // 50 meters
  private readonly HIGH_ACCURACY_OPTIONS = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 10000,
    distanceFilter: 10, // Update every 10 meters
    interval: 10000, // Update every 10 seconds
    fastestInterval: 5000, // Fastest update interval
  };

  initialize(driverId: string) {
    this.driverId = driverId;
  }

  async startTracking(): Promise<boolean> {
    try {
      // Request location permissions
      const hasPermission = await this.requestLocationPermission();
      if (!hasPermission) {
        Alert.alert(
          'Lokatsiya ruxsati',
          'Ilovaning to\'g\'ri ishlashi uchun lokatsiya ruxsati kerak.'
        );
        return false;
      }

      // Start watching position
      this.watchId = Geolocation.watchPosition(
        (position) => {
          const location: Location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };

          this.handleLocationUpdate(location);
        },
        (error) => {
          console.error('Location error:', error);
          this.handleLocationError(error);
        },
        this.HIGH_ACCURACY_OPTIONS
      );

      this.isTracking = true;

      // Set up periodic updates to server
      this.locationUpdateInterval = setInterval(() => {
        if (this.lastLocation) {
          this.sendLocationToServer(this.lastLocation);
        }
      }, this.UPDATE_INTERVAL);

      console.log('Location tracking started for driver:', this.driverId);
      return true;
    } catch (error) {
      console.error('Failed to start location tracking:', error);
      return false;
    }
  }

  stopTracking() {
    if (this.watchId !== null) {
      Geolocation.stopObserving();
      this.watchId = null;
    }

    if (this.locationUpdateInterval) {
      clearInterval(this.locationUpdateInterval);
      this.locationUpdateInterval = null;
    }

    this.isTracking = false;
    console.log('Location tracking stopped');
  }

  private async requestLocationPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);

        return (
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === 'granted' &&
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] === 'granted'
        );
      } catch (error) {
        console.error('Location permission request error:', error);
        return false;
      }
    }

    // For iOS, permissions are handled differently
    return true;
  }

  private handleLocationUpdate(location: Location) {
    // Check if location is significantly different from last location
    if (this.shouldUpdateLocation(location)) {
      this.lastLocation = location;
      
      // Send real-time update via socket
      SocketService.updateLocation({
        latitude: location.latitude,
        longitude: location.longitude,
      });

      console.log('Location updated:', {
        lat: location.latitude.toFixed(6),
        lng: location.longitude.toFixed(6),
        accuracy: location.accuracy.toFixed(1),
      });
    }
  }

  private shouldUpdateLocation(newLocation: Location): boolean {
    if (!this.lastLocation) {
      return true;
    }

    // Calculate distance from last location
    const distance = this.calculateDistance(
      this.lastLocation.latitude,
      this.lastLocation.longitude,
      newLocation.latitude,
      newLocation.longitude
    );

    // Update if moved more than threshold distance
    return distance > this.MIN_DISTANCE_THRESHOLD;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(value: number): number {
    return (value * Math.PI) / 180;
  }

  private async sendLocationToServer(location: Location) {
    if (!this.driverId) return;

    try {
      await ApiService.updateDriverLocation(this.driverId, {
        latitude: location.latitude,
        longitude: location.longitude,
      });
    } catch (error) {
      console.error('Failed to send location to server:', error);
    }
  }

  private handleLocationError(error: any) {
    console.error('Location error:', error);
    
    switch (error.code) {
      case 1: // PERMISSION_DENIED
        Alert.alert(
          'Lokatsiya ruxsati rad etildi',
          'Lokatsiya xizmatlarini yoqing va ilovaga ruxsat bering.'
        );
        break;
      case 2: // POSITION_UNAVAILABLE
        Alert.alert(
          'Lokatsiya aniqlanmadi',
          'GPS signali topilmadi. Ochiq joyda turganingizni tekshiring.'
        );
        break;
      case 3: // TIMEOUT
        Alert.alert(
          'Lokatsiya vaqti tugadi',
          'Lokatsiya aniqlashda vaqt tugadi. Qaytadan urinish.'
        );
        break;
      default:
        console.error('Unknown location error:', error);
        break;
    }
  }

  // Public methods
  getCurrentLocation(): Promise<Location> {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          const location: Location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };
          resolve(location);
        },
        (error) => {
          reject(error);
        },
        this.HIGH_ACCURACY_OPTIONS
      );
    });
  }

  getLastKnownLocation(): Location | null {
    return this.lastLocation;
  }

  isLocationTracking(): boolean {
    return this.isTracking;
  }

  // Calculate distance between two points
  static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Format distance for display
  static formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    } else {
      return `${(meters / 1000).toFixed(1)}km`;
    }
  }

  // Calculate estimated time based on distance and speed
  static calculateEstimatedTime(distanceInMeters: number, speedKmh: number = 50): number {
    const distanceInKm = distanceInMeters / 1000;
    const timeInHours = distanceInKm / speedKmh;
    return Math.round(timeInHours * 60); // Return in minutes
  }

  stop() {
    this.stopTracking();
  }
}

export const LocationService = new LocationServiceClass();