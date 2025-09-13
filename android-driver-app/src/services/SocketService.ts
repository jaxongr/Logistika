import io, { Socket } from 'socket.io-client';
import { Order } from '../App';
import PushNotification from 'react-native-push-notification';
import Sound from 'react-native-sound';

class SocketServiceClass {
  private socket: Socket | null = null;
  private driverId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isConnected = false;
  private listeners: { [key: string]: Function[] } = {};

  // Sound for new orders
  private orderSound: Sound | null = null;

  constructor() {
    // Load notification sound
    this.orderSound = new Sound('order_notification.mp3', Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.log('Failed to load sound', error);
      }
    });
  }

  initialize(driverId: string) {
    this.driverId = driverId;
    this.connect();
  }

  private connect() {
    if (this.socket) {
      this.socket.disconnect();
    }

    // Connect to the same server as the bot
    this.socket = io('http://localhost:3000', {
      transports: ['websocket'],
      timeout: 5000,
      forceNew: true,
      query: {
        driverId: this.driverId,
        type: 'mobile_app',
      },
    });

    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Socket connected to bot server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Register as driver in the bot system
      this.socket?.emit('driver_online', {
        driverId: this.driverId,
        platform: 'mobile_app',
        timestamp: Date.now(),
      });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.isConnected = false;
      
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        this.handleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.handleReconnect();
    });

    // Bot communication events
    this.socket.on('new_order', (order: Order) => {
      console.log('New order received via socket:', order.id);
      this.handleNewOrder(order);
    });

    this.socket.on('order_cancelled', (data: { orderId: string; reason: string }) => {
      console.log('Order cancelled:', data.orderId);
      this.emit('orderCancelled', data);
    });

    this.socket.on('order_update', (order: Order) => {
      console.log('Order updated:', order.id);
      this.emit('orderUpdate', order);
    });

    this.socket.on('customer_message', (data: {
      orderId: string;
      message: string;
      timestamp: number;
    }) => {
      console.log('Customer message received:', data.message);
      this.handleCustomerMessage(data);
    });

    // Driver status confirmations
    this.socket.on('status_updated', (data: {
      driverId: string;
      status: 'available' | 'busy' | 'offline';
      timestamp: number;
    }) => {
      console.log('Driver status updated:', data.status);
      this.emit('statusUpdated', data);
    });
  }

  private handleNewOrder(order: Order) {
    // Play notification sound
    if (this.orderSound) {
      this.orderSound.play();
    }

    // Show push notification
    PushNotification.localNotification({
      channelId: 'order-notifications',
      title: '🚚 Yangi buyurtma!',
      message: `${order.from} → ${order.to}\n💰 ${order.budget.toLocaleString()} so'm`,
      playSound: true,
      soundName: 'default',
      vibrate: true,
      vibration: 300,
      data: {
        type: 'new_order',
        orderId: order.id,
        from: order.from,
        to: order.to,
        budget: order.budget,
      },
    });

    // Emit to app listeners
    this.emit('newOrder', order);
  }

  private handleCustomerMessage(data: {
    orderId: string;
    message: string;
    timestamp: number;
  }) {
    // Show notification for customer message
    PushNotification.localNotification({
      channelId: 'order-notifications',
      title: '💬 Mijozdan xabar',
      message: data.message,
      playSound: true,
      soundName: 'default',
      data: {
        type: 'customer_message',
        orderId: data.orderId,
      },
    });

    this.emit('customerMessage', data);
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  // Public methods for driver actions
  goOnline() {
    if (this.socket && this.isConnected) {
      this.socket.emit('driver_status_change', {
        driverId: this.driverId,
        status: 'available',
        timestamp: Date.now(),
      });
    }
  }

  goOffline() {
    if (this.socket && this.isConnected) {
      this.socket.emit('driver_status_change', {
        driverId: this.driverId,
        status: 'offline',
        timestamp: Date.now(),
      });
    }
  }

  acceptOrder(orderId: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('order_accepted', {
        orderId,
        driverId: this.driverId,
        timestamp: Date.now(),
      });
    }
  }

  updateLocation(location: { latitude: number; longitude: number }) {
    if (this.socket && this.isConnected) {
      this.socket.emit('driver_location_update', {
        driverId: this.driverId,
        location,
        timestamp: Date.now(),
      });
    }
  }

  sendDriverMessage(orderId: string, message: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('driver_message', {
        orderId,
        driverId: this.driverId,
        message,
        timestamp: Date.now(),
      });
    }
  }

  // Event listener management
  on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string, callback?: Function) {
    if (!this.listeners[event]) return;
    
    if (callback) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    } else {
      delete this.listeners[event];
    }
  }

  private emit(event: string, data: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  // Convenience methods
  onNewOrder(callback: (order: Order) => void) {
    this.on('newOrder', callback);
  }

  onOrderUpdate(callback: (order: Order) => void) {
    this.on('orderUpdate', callback);
  }

  onOrderCancelled(callback: (data: { orderId: string; reason: string }) => void) {
    this.on('orderCancelled', callback);
  }

  onCustomerMessage(callback: (data: {
    orderId: string;
    message: string;
    timestamp: number;
  }) => void) {
    this.on('customerMessage', callback);
  }

  removeAllListeners() {
    this.listeners = {};
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.removeAllListeners();
  }

  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }
}

export const SocketService = new SocketServiceClass();