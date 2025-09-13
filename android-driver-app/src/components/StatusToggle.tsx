import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface Props {
  status: 'available' | 'busy' | 'offline';
  onStatusChange: (status: 'available' | 'busy' | 'offline') => void;
}

const StatusToggle: React.FC<Props> = ({ status, onStatusChange }) => {
  const getStatusConfig = (currentStatus: string) => {
    switch (currentStatus) {
      case 'available':
        return {
          color: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          icon: 'radio-button-checked',
          text: 'Onlayn - Buyurtma qabul qilmoqda',
          nextStatus: 'offline' as const,
          nextText: 'Oflayn ga o\'tish',
        };
      case 'busy':
        return {
          color: '#FF9800',
          backgroundColor: 'rgba(255, 152, 0, 0.1)',
          icon: 'radio-button-checked',
          text: 'Band - Buyurtma bajarilmoqda',
          nextStatus: 'available' as const,
          nextText: 'Onlayn ga qaytish',
        };
      case 'offline':
        return {
          color: '#9E9E9E',
          backgroundColor: 'rgba(158, 158, 158, 0.1)',
          icon: 'radio-button-unchecked',
          text: 'Oflayn - Buyurtma qabul qilmayapti',
          nextStatus: 'available' as const,
          nextText: 'Onlayn ga o\'tish',
        };
      default:
        return {
          color: '#9E9E9E',
          backgroundColor: 'rgba(158, 158, 158, 0.1)',
          icon: 'radio-button-unchecked',
          text: 'Noma\'lum holat',
          nextStatus: 'available' as const,
          nextText: 'Onlayn ga o\'tish',
        };
    }
  };

  const statusConfig = getStatusConfig(status);

  const handleToggle = () => {
    if (status !== 'busy') {
      onStatusChange(statusConfig.nextStatus);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: statusConfig.backgroundColor,
          borderColor: statusConfig.color,
        },
      ]}
      onPress={handleToggle}
      disabled={status === 'busy'}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Icon
            name={statusConfig.icon}
            size={20}
            color={statusConfig.color}
          />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.text}
          </Text>
          {status !== 'busy' && (
            <Text style={styles.actionText}>
              {statusConfig.nextText}
            </Text>
          )}
        </View>

        {status !== 'busy' && (
          <View style={styles.arrowContainer}>
            <Icon
              name="chevron-right"
              size={20}
              color={statusConfig.color}
            />
          </View>
        )}
      </View>

      {status === 'available' && (
        <View style={styles.pulse}>
          <View style={[styles.pulseCircle, styles.pulse1]} />
          <View style={[styles.pulseCircle, styles.pulse2]} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 2,
    marginTop: 16,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  arrowContainer: {
    marginLeft: 8,
  },
  pulse: {
    position: 'absolute',
    left: 16,
    top: 16,
  },
  pulseCircle: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    opacity: 0.3,
  },
  pulse1: {
    animation: 'pulse 2s infinite',
  },
  pulse2: {
    animation: 'pulse 2s infinite 1s',
  },
});

export default StatusToggle;