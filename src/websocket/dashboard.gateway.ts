import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'dashboard'
})
export class DashboardGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DashboardGateway.name);
  private connectedClients = new Set<string>();

  handleConnection(client: Socket) {
    this.connectedClients.add(client.id);
    this.logger.log(`🔌 Dashboard client connected: ${client.id} (Total: ${this.connectedClients.size})`);

    // Dashboard ulanganidan keyin darhol statistikalarni yuborish
    this.emitDashboardStats();
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`🔌 Dashboard client disconnected: ${client.id} (Total: ${this.connectedClients.size})`);
  }

  @SubscribeMessage('request-stats')
  handleStatsRequest(client: Socket) {
    this.logger.log(`📊 Stats requested from client: ${client.id}`);
    this.emitDashboardStats();
  }

  // Real-time data broadcast methods
  broadcastOrderUpdate(orderData: any) {
    this.logger.log(`📦 Broadcasting order update: ${orderData.id}`);
    this.server.emit('order-update', orderData);
  }

  broadcastOrderStatusChange(orderId: string, status: string, driverInfo?: any) {
    this.logger.log(`🔄 Broadcasting order status change: ${orderId} -> ${status}`);
    this.server.emit('order-status-change', {
      orderId,
      status,
      driverInfo,
      timestamp: new Date().toISOString()
    });
  }

  broadcastNewOrder(orderData: any) {
    this.logger.log(`🆕 Broadcasting new order: ${orderData.id}`);
    this.server.emit('new-order', orderData);
  }

  broadcastDriverAction(driverId: number, action: string, orderData?: any) {
    this.logger.log(`🚛 Broadcasting driver action: Driver ${driverId} -> ${action}`);
    this.server.emit('driver-action', {
      driverId,
      action,
      orderData,
      timestamp: new Date().toISOString()
    });
  }

  broadcastStatsUpdate(stats: any) {
    this.logger.log(`📈 Broadcasting stats update`);
    this.server.emit('stats-update', stats);
  }

  private emitDashboardStats() {
    // Bu method'da real statistikalarni yuborish kerak
    // Hozircha demo data
    const stats = {
      orders: 234,
      drivers: 45,
      dispatchers: 8,
      customers: 156,
      revenue: 2400000,
      completedOrders: 177,
      timestamp: new Date().toISOString()
    };

    this.server.emit('dashboard-stats', stats);
  }

  // Connection count getter
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  // Check if dashboard clients are connected
  hasConnectedClients(): boolean {
    return this.connectedClients.size > 0;
  }
}