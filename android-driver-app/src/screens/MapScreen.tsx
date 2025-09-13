import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LocationService, Location } from '../services/LocationService';
import { ApiService } from '../services/ApiService';

const { width, height } = Dimensions.get('window');

interface Props {
  navigation: any;
  currentLocation: { latitude: number; longitude: number } | null;
}

interface RouteInfo {
  distance: number;
  duration: number;
  coordinates: Array<{ latitude: number; longitude: number }>;
}

const MapScreen: React.FC<Props> = ({ navigation, currentLocation }) => {
  const mapRef = useRef<MapView>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [destination, setDestination] = useState<{
    latitude: number;
    longitude: number;
    title: string;
  } | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initialize location tracking
    startLocationTracking();
    
    // Check if there's an active order with destination
    checkActiveOrder();

    return () => {
      LocationService.stopTracking();
    };
  }, []);

  const startLocationTracking = async () => {
    try {
      const success = await LocationService.startTracking();
      if (success) {
        const currentLoc = await LocationService.getCurrentLocation();
        setLocation(currentLoc);
        
        // Center map on current location
        if (mapRef.current && currentLoc) {
          mapRef.current.animateToRegion({
            latitude: currentLoc.latitude,
            longitude: currentLoc.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Location tracking error:', error);
      Alert.alert('Xato', 'Lokatsiyani aniqlashda xatolik yuz berdi');
    }
  };

  const checkActiveOrder = async () => {
    // This would check if driver has an active order and set destination
    // For now, we'll use a sample destination
    // In real implementation, this would come from the active order data
  };

  const handleDestinationSet = (coordinate: { latitude: number; longitude: number }) => {
    setDestination({
      ...coordinate,
      title: 'Manzil',
    });
    
    if (location) {
      calculateRoute(location, coordinate);
    }
  };

  const calculateRoute = async (
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number }
  ) => {
    setIsLoading(true);
    try {
      const response = await ApiService.getRoute(from, to);
      setRouteInfo(response.data);
      
      // Fit map to show entire route
      if (mapRef.current) {
        const coordinates = [from, ...response.data.coordinates, to];
        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
          animated: true,
        });
      }
    } catch (error) {
      console.error('Route calculation error:', error);
      Alert.alert('Xato', 'Yo\'lni hisoblashda xatolik');
    } finally {
      setIsLoading(false);
    }
  };

  const startNavigation = () => {
    if (!destination || !location) return;
    
    setIsNavigating(true);
    Alert.alert(
      'Navigatsiya boshlandi',
      'Yo\'l ko\'rsatish boshlandi. Xavfsiz haydash!',
      [{ text: 'OK' }]
    );
  };

  const stopNavigation = () => {
    setIsNavigating(false);
    setDestination(null);
    setRouteInfo(null);
  };

  const centerOnLocation = () => {
    if (mapRef.current && location) {
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  const formatDistance = (meters: number): string => {
    return meters < 1000 
      ? `${Math.round(meters)}m` 
      : `${(meters / 1000).toFixed(1)}km`;
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}s ${mins}min` : `${mins}min`;
  };

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsTraffic={true}
        showsBuildings={true}
        onPress={(event) => {
          if (!isNavigating) {
            handleDestinationSet(event.nativeEvent.coordinate);
          }
        }}
        mapType="standard"
      >
        {/* Current location marker */}
        {location && (
          <Marker
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            title="Mening joyim"
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.driverMarker}>
              <Icon name="local-shipping" size={20} color="#fff" />
            </View>
          </Marker>
        )}

        {/* Destination marker */}
        {destination && (
          <Marker
            coordinate={destination}
            title={destination.title}
            pinColor="red"
          />
        )}

        {/* Route polyline */}
        {routeInfo && location && destination && (
          <Polyline
            coordinates={[
              { latitude: location.latitude, longitude: location.longitude },
              ...routeInfo.coordinates,
              destination,
            ]}
            strokeWidth={4}
            strokeColor="#2196F3"
            geodesic={true}
          />
        )}
      </MapView>

      {/* Route info panel */}
      {routeInfo && destination && (
        <View style={styles.routePanel}>
          <LinearGradient
            colors={['#fff', '#f8f9fa']}
            style={styles.routePanelGradient}
          >
            <View style={styles.routeInfo}>
              <View style={styles.routeStats}>
                <View style={styles.statItem}>
                  <Icon name="straighten" size={20} color="#2196F3" />
                  <Text style={styles.statValue}>
                    {formatDistance(routeInfo.distance)}
                  </Text>
                  <Text style={styles.statLabel}>Masofa</Text>
                </View>
                
                <View style={styles.statDivider} />
                
                <View style={styles.statItem}>
                  <Icon name="access-time" size={20} color="#4CAF50" />
                  <Text style={styles.statValue}>
                    {formatDuration(routeInfo.duration)}
                  </Text>
                  <Text style={styles.statLabel}>Vaqt</Text>
                </View>
              </View>

              <View style={styles.routeActions}>
                {!isNavigating ? (
                  <TouchableOpacity
                    style={styles.startButton}
                    onPress={startNavigation}
                  >
                    <LinearGradient
                      colors={['#4CAF50', '#45a049']}
                      style={styles.startButtonGradient}
                    >
                      <Icon name="navigation" size={20} color="#fff" />
                      <Text style={styles.startButtonText}>Boshlash</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.stopButton}
                    onPress={stopNavigation}
                  >
                    <Text style={styles.stopButtonText}>To'xtatish</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </LinearGradient>
        </View>
      )}

      {/* Control buttons */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={centerOnLocation}
        >
          <LinearGradient
            colors={['#2196F3', '#1976D2']}
            style={styles.controlButtonGradient}
          >
            <Icon name="my-location" size={24} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.controlButton, { marginTop: 10 }]}
          onPress={() => {
            // Toggle map type or other controls
          }}
        >
          <LinearGradient
            colors={['#FF9800', '#F57C00']}
            style={styles.controlButtonGradient}
          >
            <Icon name="layers" size={24} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Navigation status bar */}
      {isNavigating && (
        <View style={styles.navigationBar}>
          <LinearGradient
            colors={['#4CAF50', '#45a049']}
            style={styles.navigationBarGradient}
          >
            <Icon name="navigation" size={16} color="#fff" />
            <Text style={styles.navigationText}>Navigatsiya faol</Text>
            <View style={styles.navigationPulse} />
          </LinearGradient>
        </View>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <Icon name="route" size={32} color="#2196F3" />
            <Text style={styles.loadingText}>Yo'l hisoblanmoqda...</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  driverMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  routePanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  routePanelGradient: {
    padding: 20,
  },
  routeInfo: {
    alignItems: 'center',
  },
  routeStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 20,
  },
  routeActions: {
    width: '100%',
  },
  startButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  stopButton: {
    backgroundColor: '#F44336',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  controls: {
    position: 'absolute',
    right: 16,
    bottom: 120,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  controlButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navigationBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  navigationBarGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  navigationText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  navigationPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginLeft: 8,
    opacity: 0.8,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    backgroundColor: '#fff',
    paddingVertical: 24,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  loadingText: {
    fontSize: 16,
    color: '#333',
    marginTop: 12,
    fontWeight: '500',
  },
});

export default MapScreen;