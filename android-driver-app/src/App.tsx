import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  StatusBar,
  SafeAreaView,
} from 'react-native';

// Simple Yo'lda Driver App for APK
const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [phone, setPhone] = useState('');
  const [orders, setOrders] = useState([
    {
      id: '1',
      from: 'Toshkent',
      to: 'Samarqand',
      cargo: 'Mebel',
      price: '2,500,000 so\'m',
      date: 'Bugun',
    },
    {
      id: '2', 
      from: 'Nukus',
      to: 'Toshkent',
      cargo: 'Oziq-ovqat',
      price: '1,800,000 so\'m',
      date: 'Ertaga',
    },
  ]);

  const handleLogin = () => {
    if (phone.length > 8) {
      setIsLoggedIn(true);
      Alert.alert('Muvaffaqiyat', 'Tizimga kirildi!');
    } else {
      Alert.alert('Xato', 'Telefon raqamni to\'g\'ri kiriting');
    }
  };

  const handleAcceptOrder = (orderId: string) => {
    Alert.alert(
      'Buyurtma qabul qilindi',
      `Buyurtma ${orderId} muvaffaqiyatli qabul qilindi!`,
      [{ text: 'OK' }]
    );
  };

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2196F3" />
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>🚛</Text>
          <Text style={styles.headerTitle}>Yo'lda Driver</Text>
          <Text style={styles.headerSubtitle}>Professional haydovchilar platformasi</Text>
        </View>

        {/* Login Form */}
        <View style={styles.loginContainer}>
          <Text style={styles.formTitle}>Tizimga kirish</Text>
          
          <TextInput
            style={styles.input}
            placeholder="+998 XX XXX XX XX"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={13}
          />
          
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Kirish</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2196F3" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>🚛</Text>
        <Text style={styles.headerTitle}>Yo'lda Driver</Text>
        <View style={styles.statusContainer}>
          <View style={styles.statusIndicator} />
          <Text style={styles.statusText}>Online</Text>
        </View>
      </View>

      {/* Orders List */}
      <ScrollView style={styles.ordersContainer}>
        <Text style={styles.sectionTitle}>Mavjud buyurtmalar</Text>
        
        {orders.map((order) => (
          <View key={order.id} style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <Text style={styles.orderRoute}>
                {order.from} → {order.to}
              </Text>
              <Text style={styles.orderPrice}>{order.price}</Text>
            </View>
            
            <Text style={styles.orderCargo}>🚛 {order.cargo}</Text>
            <Text style={styles.orderDate}>📅 {order.date}</Text>
            
            <View style={styles.orderActions}>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => handleAcceptOrder(order.id)}
              >
                <Text style={styles.acceptButtonText}>Qabul qilish</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navText}>🏠 Bosh sahifa</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navText}>🗺️ Xarita</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navText}>👤 Profil</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  logo: {
    fontSize: 40,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 32,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  loginButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ordersContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderRoute: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  orderPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  orderCargo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  orderActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  navText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});

export default App;