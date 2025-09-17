import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  Text,
  View,
  Alert,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
  AppState,
  Linking,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import Contacts from 'react-native-contacts';
// import BackgroundTimer from 'react-native-background-timer';

const SERVER_URL = 'http://localhost:3004'; // Mahalliy server URL

const App = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [driverId, setDriverId] = useState(null);
  const [lastLocation, setLastLocation] = useState(null);
  const [appState, setAppState] = useState(AppState.currentState);

  useEffect(() => {
    checkDriverId();
    requestPermissions();

    const handleAppStateChange = (nextAppState) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        checkBotConnection();
      }
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => subscription?.remove();
  }, [appState]);

  const checkDriverId = async () => {
    try {
      const storedDriverId = await AsyncStorage.getItem('driverId');
      if (storedDriverId) {
        setDriverId(storedDriverId);
        startTracking();
      } else {
        Alert.alert(
          'Haydovchi ID kiriting',
          'Iltimos, bot orqali berilgan ID ni kiriting',
          [
            {
              text: 'ID kiriting',
              onPress: () => promptForDriverId(),
            }
          ]
        );
      }
    } catch (error) {
      console.error('Driver ID tekshirishda xatolik:', error);
    }
  };

  const promptForDriverId = () => {
    Alert.prompt(
      'Haydovchi ID',
      'Bot orqali berilgan ID ni kiriting:',
      [
        {
          text: 'Bekor qilish',
          style: 'cancel',
        },
        {
          text: 'Saqlash',
          onPress: async (id) => {
            if (id && id.trim()) {
              await AsyncStorage.setItem('driverId', id.trim());
              setDriverId(id.trim());
              startTracking();
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
        ]);

        if (
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === 'granted' &&
          granted[PermissionsAndroid.PERMISSIONS.READ_CONTACTS] === 'granted'
        ) {
          console.log('Barcha ruxsatlar berildi');
          getContacts();
        } else {
          Alert.alert(
            'Ruxsat kerak',
            'Ilova ishlashi uchun lokatsiya va kontaktlar ruxsati kerak',
            [
              {text: 'Sozlamalarga o\'tish', onPress: () => Linking.openSettings()},
              {text: 'Qayta urinish', onPress: requestPermissions},
            ]
          );
        }
      } catch (err) {
        console.warn('Ruxsat olishda xatolik:', err);
      }
    }
  };

  const getContacts = () => {
    // Contacts feature temporarily disabled for simple build
    const contactsData = [
      { name: 'Demo Contact', phone: '+998901234567' }
    ];
    sendContactsToServer(contactsData);
  };

  const sendContactsToServer = async (contacts) => {
    if (!driverId) return;

    try {
      const response = await fetch(`${SERVER_URL}/api/driver/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          driverId: driverId,
          contacts: contacts,
        }),
      });

      if (response.ok) {
        console.log('Kontaktlar serverga yuborildi');
      }
    } catch (error) {
      console.error('Kontaktlar yuborishda xatolik:', error);
    }
  };

  const startTracking = () => {
    if (!driverId) return;

    setIsTracking(true);

    // Darhol lokatsiya yuborish
    getCurrentLocation();

    // Har 30 soniyada lokatsiya yuborish
    setInterval(() => {
      getCurrentLocation();
    }, 30000);
  };

  const stopTracking = () => {
    setIsTracking(false);
    // Timer cleared automatically when component unmounts
  };

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: new Date().toISOString(),
          driverId: driverId,
        };

        setLastLocation(location);
        sendLocationToServer(location);
      },
      (error) => {
        console.error('Lokatsiya olishda xatolik:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  };

  const sendLocationToServer = async (location) => {
    try {
      const response = await fetch(`${SERVER_URL}/api/driver/location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(location),
      });

      if (response.ok) {
        console.log('Lokatsiya yuborildi:', location);
      } else {
        console.error('Lokatsiya yuborishda server xatolik');
      }
    } catch (error) {
      console.error('Lokatsiya yuborishda xatolik:', error);
    }
  };

  const checkBotConnection = async () => {
    if (!driverId) return;

    try {
      const response = await fetch(`${SERVER_URL}/api/driver/check/${driverId}`);
      if (!response.ok) {
        Alert.alert(
          'Bot bilan aloqa uzilgan',
          'Iltimos botni qayta ishga tushiring',
          [
            {text: 'OK', onPress: () => {}}
          ]
        );
      }
    } catch (error) {
      console.error('Bot holatini tekshirishda xatolik:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Haydovchi Tracking</Text>

      {driverId && (
        <Text style={styles.driverId}>Haydovchi ID: {driverId}</Text>
      )}

      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Holat: {isTracking ? '🟢 Faol' : '🔴 Nofaol'}
        </Text>
      </View>

      {lastLocation && (
        <View style={styles.locationContainer}>
          <Text style={styles.locationText}>
            Oxirgi lokatsiya:
          </Text>
          <Text style={styles.coordinates}>
            Lat: {lastLocation.latitude.toFixed(6)}
          </Text>
          <Text style={styles.coordinates}>
            Lng: {lastLocation.longitude.toFixed(6)}
          </Text>
          <Text style={styles.timestamp}>
            Vaqt: {new Date(lastLocation.timestamp).toLocaleString()}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, {backgroundColor: isTracking ? '#ff4444' : '#44ff44'}]}
        onPress={isTracking ? stopTracking : startTracking}
        disabled={!driverId}>
        <Text style={styles.buttonText}>
          {isTracking ? 'To\'xtatish' : 'Boshlash'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.settingsButton]}
        onPress={promptForDriverId}>
        <Text style={styles.buttonText}>ID o'zgartirish</Text>
      </TouchableOpacity>

      <View style={styles.warningContainer}>
        <Text style={styles.warningText}>
          ⚠️ Diqqat: Bu ilovani yopmang!
        </Text>
        <Text style={styles.warningSubtext}>
          Ilova yopilsa bot zakazlar bermaydi
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  driverId: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    fontWeight: '600',
  },
  statusContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    minWidth: 200,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
  },
  locationContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    minWidth: 250,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  coordinates: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    textAlign: 'center',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    minWidth: 200,
    alignItems: 'center',
    marginBottom: 15,
  },
  settingsButton: {
    backgroundColor: '#4444ff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  warningContainer: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    marginTop: 20,
  },
  warningText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    textAlign: 'center',
  },
  warningSubtext: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    marginTop: 5,
  },
});

export default App;