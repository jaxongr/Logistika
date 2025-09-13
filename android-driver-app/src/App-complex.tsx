import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  StatusBar,
  PermissionsAndroid,
  Platform,
  Alert,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from 'react-native-geolocation-service';
import PushNotification from 'react-native-push-notification';

// Screens
import SplashScreen from './screens/SplashScreen';
import LoginScreen from './screens/LoginScreen';
import RegistrationScreen from './screens/RegistrationScreen';
import HomeScreen from './screens/HomeScreen';
import OrderDetailsScreen from './screens/OrderDetailsScreen';
import MapScreen from './screens/MapScreen';
import ProfileScreen from './screens/ProfileScreen';
import OrderHistoryScreen from './screens/OrderHistoryScreen';

// Services
import { ApiService } from './services/ApiService';
import { SocketService } from './services/SocketService';
import { LocationService } from './services/LocationService';

// Types
export interface Driver {
  id: string;
  userId: number;
  username: string;
  driverName: string;
  phone: string;
  truckType: string;
  capacity: number;
  rating: number;
  completedOrders: number;
  status: 'available' | 'busy' | 'offline';
}

export interface Order {
  id: string;
  from: string;
  to: string;
  cargoDescription: string;
  truckType: string;
  budget: number;
  loadingDate: string;
  customerName: string;
  customerPhone?: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  distance?: number;
  estimatedTime?: number;
  routeCoordinates?: Array<{ latitude: number; longitude: number }>;
}

const Stack = createStackNavigator();

interface AppState {
  isLoading: boolean;
  isAuthenticated: boolean;
  driver: Driver | null;
  currentLocation: { latitude: number; longitude: number } | null;
}

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    isLoading: true,
    isAuthenticated: false,
    driver: null,
    currentLocation: null,
  });

  useEffect(() => {
    initializeApp();
    setupPushNotifications();
    requestLocationPermission();
  }, []);

  const initializeApp = async () => {
    try {
      // Check if driver is already logged in
      const driverData = await AsyncStorage.getItem('driver');
      if (driverData) {
        const driver = JSON.parse(driverData);
        setState(prev => ({
          ...prev,
          isAuthenticated: true,
          driver,
          isLoading: false,
        }));
        
        // Initialize services with driver data
        ApiService.setAuthToken(driver.id);
        SocketService.initialize(driver.id);
        LocationService.initialize(driver.id);
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('App initialization error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const setupPushNotifications = () => {
    PushNotification.configure({
      onNotification: function(notification) {
        console.log('Push notification received:', notification);
        
        // Handle new order notifications
        if (notification.data?.type === 'new_order') {
          Alert.alert(
            '🚚 Yangi buyurtma!',
            `${notification.data.from} → ${notification.data.to}\\n💰 ${notification.data.budget} so'm`,
            [
              { text: 'Keyinroq', style: 'cancel' },
              { 
                text: 'Ko\'rish', 
                onPress: () => {
                  // Navigate to order details
                  // This will be handled by navigation state
                }
              }
            ]
          );
        }
      },
      requestPermissions: Platform.OS === 'ios',
    });

    // Create notification channel for Android
    PushNotification.createChannel({
      channelId: 'order-notifications',
      channelName: 'Order Notifications',
      channelDescription: 'Notifications for new cargo orders',
      soundName: 'default',
      importance: 4,
      vibrate: true,
    });
  };

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);

        if (
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === 'granted' &&
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] === 'granted'
        ) {
          getCurrentLocation();
        } else {
          Alert.alert(
            'Lokatsiya ruxsati',
            'Ilovaning to\'g\'ri ishlashi uchun lokatsiya ruxsati kerak.',
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        console.error('Location permission error:', error);
      }
    } else {
      getCurrentLocation();
    }
  };

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        setState(prev => ({
          ...prev,
          currentLocation: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
        }));
      },
      (error) => {
        console.error('Location error:', error);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const handleLogin = async (driver: Driver) => {
    try {
      await AsyncStorage.setItem('driver', JSON.stringify(driver));
      setState(prev => ({
        ...prev,
        isAuthenticated: true,
        driver,
      }));

      // Initialize services
      ApiService.setAuthToken(driver.id);
      SocketService.initialize(driver.id);
      LocationService.initialize(driver.id);
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Xato', 'Tizimga kirishda xatolik yuz berdi');
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('driver');
      SocketService.disconnect();
      LocationService.stop();
      setState({
        isLoading: false,
        isAuthenticated: false,
        driver: null,
        currentLocation: null,
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (state.isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#2196F3"
        translucent={false}
      />
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2196F3',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 18,
          },
        }}
      >
        {!state.isAuthenticated ? (
          <>
            <Stack.Screen
              name="Login"
              options={{ headerShown: false }}
            >
              {props => <LoginScreen {...props} onLogin={handleLogin} />}
            </Stack.Screen>
            <Stack.Screen
              name="Registration"
              options={{ 
                title: 'Ro\'yxatdan o\'tish',
                headerBackTitleVisible: false,
              }}
            >
              {props => <RegistrationScreen {...props} onRegister={handleLogin} />}
            </Stack.Screen>
          </>
        ) : (
          <>
            <Stack.Screen
              name="Home"
              options={{ 
                title: 'Yo\'lda Driver',
                headerRight: () => null,
              }}
            >
              {props => (
                <HomeScreen
                  {...props}
                  driver={state.driver!}
                  currentLocation={state.currentLocation}
                  onLogout={handleLogout}
                />
              )}
            </Stack.Screen>
            <Stack.Screen
              name="OrderDetails"
              options={{ title: 'Buyurtma tafsilotlari' }}
              component={OrderDetailsScreen}
            />
            <Stack.Screen
              name="Map"
              options={{ title: 'Xarita' }}
            >
              {props => (
                <MapScreen
                  {...props}
                  currentLocation={state.currentLocation}
                />
              )}
            </Stack.Screen>
            <Stack.Screen
              name="Profile"
              options={{ title: 'Profil' }}
            >
              {props => (
                <ProfileScreen
                  {...props}
                  driver={state.driver!}
                  onLogout={handleLogout}
                />
              )}
            </Stack.Screen>
            <Stack.Screen
              name="OrderHistory"
              options={{ title: 'Buyurtmalar tarixi' }}
              component={OrderHistoryScreen}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;