import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Driver, Order } from '../App';
import { ApiService } from '../services/ApiService';
import { SocketService } from '../services/SocketService';
import OrderCard from '../components/OrderCard';
import StatusToggle from '../components/StatusToggle';

const { width } = Dimensions.get('window');

interface Props {
  navigation: any;
  driver: Driver;
  currentLocation: { latitude: number; longitude: number } | null;
  onLogout: () => void;
}

const HomeScreen: React.FC<Props> = ({
  navigation,
  driver,
  currentLocation,
  onLogout,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [driverStatus, setDriverStatus] = useState<'available' | 'busy' | 'offline'>(
    driver.status || 'offline'
  );
  const [earnings, setEarnings] = useState({
    today: 0,
    week: 0,
    month: 0,
  });

  useEffect(() => {
    loadOrders();
    loadEarnings();
    
    // Listen for new orders via socket
    SocketService.onNewOrder((order: Order) => {
      setOrders(prev => [order, ...prev]);
      // Show notification sound or vibration
    });

    // Listen for order updates
    SocketService.onOrderUpdate((updatedOrder: Order) => {
      setOrders(prev =>
        prev.map(order =>
          order.id === updatedOrder.id ? updatedOrder : order
        )
      );
    });

    return () => {
      SocketService.removeAllListeners();
    };
  }, []);

  const loadOrders = async () => {
    try {
      const response = await ApiService.getAvailableOrders();
      setOrders(response.data);
    } catch (error) {
      console.error('Load orders error:', error);
      Alert.alert('Xato', 'Buyurtmalarni yuklashda xatolik');
    }
  };

  const loadEarnings = async () => {
    try {
      const response = await ApiService.getDriverEarnings(driver.id);
      setEarnings(response.data);
    } catch (error) {
      console.error('Load earnings error:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadOrders(), loadEarnings()]);
    setIsRefreshing(false);
  };

  const handleStatusChange = async (status: 'available' | 'busy' | 'offline') => {
    try {
      await ApiService.updateDriverStatus(driver.id, status);
      setDriverStatus(status);
      
      if (status === 'available') {
        SocketService.goOnline();
      } else {
        SocketService.goOffline();
      }
    } catch (error) {
      Alert.alert('Xato', 'Status o\'zgartirishda xatolik');
    }
  };

  const handleOrderAction = async (orderId: string, action: 'accept' | 'decline') => {
    try {
      if (action === 'accept') {
        await ApiService.acceptOrder(orderId, driver.id);
        Alert.alert('Muvaffaqiyat', 'Buyurtma qabul qilindi!');
        navigation.navigate('OrderDetails', { orderId });
      } else {
        await ApiService.declineOrder(orderId, driver.id);
      }
      
      // Remove order from list
      setOrders(prev => prev.filter(order => order.id !== orderId));
    } catch (error) {
      Alert.alert('Xato', 'Buyurtmani qayta ishlashda xatolik');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return '#4CAF50';
      case 'busy': return '#FF9800';
      case 'offline': return '#9E9E9E';
      default: return '#9E9E9E';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'Onlayn';
      case 'busy': return 'Band';
      case 'offline': return 'Oflayn';
      default: return 'Noma\'lum';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with gradient */}
      <LinearGradient
        colors={['#2196F3', '#1976D2']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.driverInfo}>
            <View style={styles.avatarContainer}>
              <Icon name="person" size={24} color="#fff" />
            </View>
            <View style={styles.driverDetails}>
              <Text style={styles.driverName}>{driver.driverName}</Text>
              <Text style={styles.driverTruck}>{driver.truckType}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Icon name="menu" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Status Toggle */}
        <StatusToggle
          status={driverStatus}
          onStatusChange={handleStatusChange}
        />

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>⭐ {driver.rating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Reyting</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{driver.completedOrders}</Text>
            <Text style={styles.statLabel}>Buyurtmalar</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{earnings.today.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Bugun</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Map')}
        >
          <LinearGradient
            colors={['#4CAF50', '#388E3C']}
            style={styles.actionButtonGradient}
          >
            <Icon name="map" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Xarita</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('OrderHistory')}
        >
          <LinearGradient
            colors={['#FF9800', '#F57C00']}
            style={styles.actionButtonGradient}
          >
            <Icon name="history" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Tarix</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Orders List */}
      <View style={styles.ordersSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mavjud buyurtmalar</Text>
          <Text style={styles.orderCount}>{orders.length} ta</Text>
        </View>

        <ScrollView
          style={styles.ordersList}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#2196F3']}
            />
          }
        >
          {orders.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="inbox" size={64} color="#E0E0E0" />
              <Text style={styles.emptyStateText}>
                {driverStatus === 'available' 
                  ? 'Hozircha yangi buyurtmalar yo\'q' 
                  : 'Buyurtmalar olish uchun "Onlayn" rejimiga o\'ting'
                }
              </Text>
            </View>
          ) : (
            orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onAccept={() => handleOrderAction(order.id, 'accept')}
                onDecline={() => handleOrderAction(order.id, 'decline')}
                currentLocation={currentLocation}
              />
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  driverTruck: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  menuButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  actionButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  ordersSection: {
    flex: 1,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  orderCount: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ordersList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
  },
});

export default HomeScreen;