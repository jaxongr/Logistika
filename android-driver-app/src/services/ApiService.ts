import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { Driver, Order } from '../App';

class ApiServiceClass {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    // Use the same server as the bot
    this.baseURL = 'http://localhost:3000'; // Change to your server URL
    
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        console.log('API Request:', config.method?.toUpperCase(), config.url);
        return config;
      },
      (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => {
        console.log('API Response:', response.status, response.config.url);
        return response;
      },
      (error) => {
        console.error('API Response Error:', error.response?.status, error.message);
        return Promise.reject(error);
      }
    );
  }

  setAuthToken(driverId: string) {
    this.api.defaults.headers.common['Authorization'] = `Driver ${driverId}`;
  }

  // Driver Authentication
  async loginDriver(phone: string): Promise<AxiosResponse<{ driver: Driver }>> {
    return this.api.post('/api/driver/login', { phone });
  }

  async registerDriver(driverData: {
    name: string;
    phone: string;
    tonnageMin: number;
    tonnageMax: number;
    price1: number;
    price2: number;
  }): Promise<AxiosResponse<{ driver: Driver }>> {
    return this.api.post('/api/driver/register', driverData);
  }

  // Driver Status Management
  async updateDriverStatus(
    driverId: string,
    status: 'available' | 'busy' | 'offline'
  ): Promise<AxiosResponse<{ success: boolean }>> {
    return this.api.put(`/api/driver/${driverId}/status`, { status });
  }

  async updateDriverLocation(
    driverId: string,
    location: { latitude: number; longitude: number }
  ): Promise<AxiosResponse<{ success: boolean }>> {
    return this.api.put(`/api/driver/${driverId}/location`, location);
  }

  // Orders Management
  async getAvailableOrders(): Promise<AxiosResponse<Order[]>> {
    return this.api.get('/api/orders/available');
  }

  async acceptOrder(
    orderId: string,
    driverId: string
  ): Promise<AxiosResponse<{ success: boolean; order: Order }>> {
    return this.api.post(`/api/orders/${orderId}/accept`, { driverId });
  }

  async declineOrder(
    orderId: string,
    driverId: string
  ): Promise<AxiosResponse<{ success: boolean }>> {
    return this.api.post(`/api/orders/${orderId}/decline`, { driverId });
  }

  async getOrderDetails(orderId: string): Promise<AxiosResponse<Order>> {
    return this.api.get(`/api/orders/${orderId}`);
  }

  async updateOrderStatus(
    orderId: string,
    status: 'accepted' | 'in_progress' | 'completed' | 'cancelled',
    location?: { latitude: number; longitude: number }
  ): Promise<AxiosResponse<{ success: boolean }>> {
    return this.api.put(`/api/orders/${orderId}/status`, { status, location });
  }

  // Driver Profile & Stats
  async getDriverProfile(driverId: string): Promise<AxiosResponse<Driver>> {
    return this.api.get(`/api/driver/${driverId}/profile`);
  }

  async getDriverEarnings(driverId: string): Promise<AxiosResponse<{
    today: number;
    week: number;
    month: number;
  }>> {
    return this.api.get(`/api/driver/${driverId}/earnings`);
  }

  async getDriverOrderHistory(
    driverId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<AxiosResponse<Order[]>> {
    return this.api.get(`/api/driver/${driverId}/orders`, {
      params: { limit, offset }
    });
  }

  // Route & Navigation
  async getRoute(
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number }
  ): Promise<AxiosResponse<{
    distance: number;
    duration: number;
    coordinates: Array<{ latitude: number; longitude: number }>;
  }>> {
    return this.api.post('/api/route', { from, to });
  }

  // Communication with Bot
  async notifyCustomerDriverContact(
    orderId: string,
    driverId: string
  ): Promise<AxiosResponse<{ success: boolean }>> {
    return this.api.post(`/api/orders/${orderId}/driver-contact`, { driverId });
  }

  async sendLocationUpdate(
    orderId: string,
    location: { latitude: number; longitude: number }
  ): Promise<AxiosResponse<{ success: boolean }>> {
    return this.api.post(`/api/orders/${orderId}/location`, location);
  }

  // Emergency & Support
  async reportEmergency(
    driverId: string,
    orderId: string,
    message: string,
    location: { latitude: number; longitude: number }
  ): Promise<AxiosResponse<{ success: boolean }>> {
    return this.api.post('/api/emergency', {
      driverId,
      orderId,
      message,
      location
    });
  }

  // App Configuration
  async getAppConfig(): Promise<AxiosResponse<{
    minAppVersion: string;
    updateRequired: boolean;
    supportPhone: string;
    emergencyPhone: string;
  }>> {
    return this.api.get('/api/config');
  }
}

export const ApiService = new ApiServiceClass();