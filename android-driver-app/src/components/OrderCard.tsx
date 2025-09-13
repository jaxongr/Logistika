import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Order } from '../App';

const { width } = Dimensions.get('window');

interface Props {
  order: Order;
  onAccept: () => void;
  onDecline: () => void;
  currentLocation?: { latitude: number; longitude: number } | null;
}

const OrderCard: React.FC<Props> = ({
  order,
  onAccept,
  onDecline,
  currentLocation,
}) => {
  const formatPrice = (amount: number) => {
    return amount.toLocaleString() + " so'm";
  };

  const getDistanceText = (distance?: number) => {
    if (!distance) return '';
    return distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`;
  };

  const getTimeText = (estimatedTime?: number) => {
    if (!estimatedTime) return '';
    const hours = Math.floor(estimatedTime / 60);
    const minutes = estimatedTime % 60;
    return hours > 0 ? `${hours}s ${minutes}min` : `${minutes}min`;
  };

  return (
    <View style={styles.container}>
      {/* Header with route */}
      <View style={styles.header}>
        <View style={styles.routeContainer}>
          <View style={styles.routePoint}>
            <View style={styles.startPoint} />
            <Text style={styles.routeText} numberOfLines={1}>
              {order.from}
            </Text>
          </View>
          
          <View style={styles.routeLine}>
            <View style={styles.dottedLine} />
            <Icon name="arrow-forward" size={16} color="#2196F3" />
          </View>
          
          <View style={styles.routePoint}>
            <View style={styles.endPoint} />
            <Text style={styles.routeText} numberOfLines={1}>
              {order.to}
            </Text>
          </View>
        </View>
        
        <View style={styles.priceContainer}>
          <Text style={styles.priceAmount}>{formatPrice(order.budget)}</Text>
          <Text style={styles.priceLabel}>Narx</Text>
        </View>
      </View>

      {/* Order Details */}
      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Icon name="local-shipping" size={16} color="#666" />
          <Text style={styles.detailText}>{order.cargoDescription}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Icon name="build" size={16} color="#666" />
          <Text style={styles.detailText}>{order.truckType}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Icon name="schedule" size={16} color="#666" />
          <Text style={styles.detailText}>{order.loadingDate}</Text>
        </View>

        {(order.distance || order.estimatedTime) && (
          <View style={styles.metaInfo}>
            {order.distance && (
              <View style={styles.metaItem}>
                <Icon name="place" size={14} color="#999" />
                <Text style={styles.metaText}>{getDistanceText(order.distance)}</Text>
              </View>
            )}
            {order.estimatedTime && (
              <View style={styles.metaItem}>
                <Icon name="access-time" size={14} color="#999" />
                <Text style={styles.metaText}>{getTimeText(order.estimatedTime)}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.declineButton} onPress={onDecline}>
          <Text style={styles.declineButtonText}>Rad etish</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
          <LinearGradient
            colors={['#4CAF50', '#45a049']}
            style={styles.acceptButtonGradient}
          >
            <Text style={styles.acceptButtonText}>Qabul qilish</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  routeContainer: {
    flex: 1,
    marginRight: 16,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  startPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 12,
  },
  endPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F44336',
    marginRight: 12,
  },
  routeText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  routeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
    marginBottom: 8,
  },
  dottedLine: {
    width: 2,
    height: 20,
    backgroundColor: '#E0E0E0',
    marginRight: 12,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  details: {
    padding: 16,
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
  metaInfo: {
    flexDirection: 'row',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 12,
    gap: 12,
  },
  declineButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  declineButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  acceptButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  acceptButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

export default OrderCard;