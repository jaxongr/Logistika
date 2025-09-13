import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface Props {
  navigation: any;
  driver: any;
  onLogout: () => void;
}

const ProfileScreen: React.FC<Props> = ({ navigation, driver, onLogout }) => {
  return (
    <View style={styles.container}>
      <View style={styles.profileHeader}>
        <Icon name="person" size={64} color="#2196F3" />
        <Text style={styles.driverName}>{driver.driverName}</Text>
        <Text style={styles.driverPhone}>{driver.phone}</Text>
      </View>
      
      <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
        <Text style={styles.logoutText}>Chiqish</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  profileHeader: { alignItems: 'center', marginBottom: 40 },
  driverName: { fontSize: 24, fontWeight: 'bold', marginTop: 16 },
  driverPhone: { fontSize: 16, color: '#666', marginTop: 8 },
  logoutButton: { backgroundColor: '#F44336', padding: 16, borderRadius: 8 },
  logoutText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
});

export default ProfileScreen;