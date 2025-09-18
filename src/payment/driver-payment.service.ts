import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { DriverPayment, DriverBalance, PaymentSettings } from './interfaces/payment.interfaces';

@Injectable()
export class DriverPaymentService {
  private readonly logger = new Logger(DriverPaymentService.name);
  private readonly paymentsFilePath = path.join(process.cwd(), 'driver-payments.json');
  private readonly balancesFilePath = path.join(process.cwd(), 'driver-balances.json');
  private readonly settingsFilePath = path.join(process.cwd(), 'payment-settings.json');

  // Default payment settings
  private defaultSettings: PaymentSettings = {
    defaultCommissionRate: 10, // 10% commission
    minimumPayment: 50000, // 50,000 UZS minimum
    paymentSchedule: 'weekly',
    autoPayoutEnabled: false,
    taxRate: 12, // 12% tax in Uzbekistan
    currency: 'UZS',
    paymentMethods: ['cash', 'bank_transfer', 'click', 'payme']
  };

  async createPayment(orderData: any, driverId: number): Promise<DriverPayment> {
    try {
      const settings = await this.getPaymentSettings();
      const commissionRate = settings.defaultCommissionRate;
      const taxRate = settings.taxRate;

      const orderAmount = orderData.price || orderData.amount || 0;
      const commissionAmount = Math.round(orderAmount * (commissionRate / 100));
      const taxAmount = Math.round(commissionAmount * (taxRate / 100));
      const netPayment = commissionAmount - taxAmount;

      const payment: DriverPayment = {
        id: `payment_${Date.now()}_${driverId}`,
        driverId,
        driverName: orderData.driverName || 'Unknown Driver',
        orderId: orderData.id,
        orderAmount,
        commissionRate,
        commissionAmount,
        netPayment,
        taxAmount,
        paymentDate: new Date().toISOString(),
        paymentMethod: 'pending' as any,
        status: 'pending',
        invoiceNumber: await this.generateInvoiceNumber(),
        fuelCost: this.calculateFuelCost(orderData),
        additionalCosts: 0,
        bonusAmount: this.calculateBonus(orderData),
        penaltyAmount: 0,
        notes: `Commission for order ${orderData.id}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await this.savePayment(payment);
      await this.updateDriverBalance(driverId, payment);

      this.logger.log(`💰 Payment created for driver ${driverId}: ${netPayment} UZS`);
      return payment;

    } catch (error) {
      this.logger.error('Error creating payment:', error);
      throw error;
    }
  }

  async getDriverPayments(driverId: number): Promise<DriverPayment[]> {
    try {
      const payments = await this.loadPayments();
      return payments.filter(p => p.driverId === driverId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      this.logger.error('Error getting driver payments:', error);
      return [];
    }
  }

  async getDriverBalance(driverId: number): Promise<DriverBalance> {
    try {
      const balances = await this.loadBalances();
      return balances.find(b => b.driverId === driverId) || {
        driverId,
        totalEarnings: 0,
        totalCommissions: 0,
        pendingPayments: 0,
        completedPayments: 0,
        currentBalance: 0,
        lastPaymentDate: '',
        nextPaymentDate: this.calculateNextPaymentDate()
      };
    } catch (error) {
      this.logger.error('Error getting driver balance:', error);
      throw error;
    }
  }

  async processPayment(paymentId: string, paymentMethod: string): Promise<boolean> {
    try {
      const payments = await this.loadPayments();
      const paymentIndex = payments.findIndex(p => p.id === paymentId);

      if (paymentIndex === -1) {
        throw new Error('Payment not found');
      }

      payments[paymentIndex].status = 'processing';
      payments[paymentIndex].paymentMethod = paymentMethod as any;
      payments[paymentIndex].updatedAt = new Date().toISOString();

      await this.savePayments(payments);

      // Simulate payment processing
      setTimeout(async () => {
        payments[paymentIndex].status = 'completed';
        payments[paymentIndex].updatedAt = new Date().toISOString();
        await this.savePayments(payments);

        await this.updateDriverBalance(payments[paymentIndex].driverId, payments[paymentIndex]);
        this.logger.log(`✅ Payment ${paymentId} completed successfully`);
      }, 2000);

      return true;

    } catch (error) {
      this.logger.error('Error processing payment:', error);
      return false;
    }
  }

  async calculateDriverEarnings(driverId: number, period: string): Promise<any> {
    try {
      const payments = await this.getDriverPayments(driverId);
      const startDate = this.getPerionStartDate(period);

      const periodPayments = payments.filter(p =>
        new Date(p.createdAt) >= startDate && p.status === 'completed'
      );

      const totalOrders = periodPayments.length;
      const totalEarnings = periodPayments.reduce((sum, p) => sum + p.netPayment, 0);
      const totalCommissions = periodPayments.reduce((sum, p) => sum + p.commissionAmount, 0);
      const averagePerOrder = totalOrders > 0 ? totalEarnings / totalOrders : 0;

      return {
        period,
        totalOrders,
        totalEarnings,
        totalCommissions,
        averagePerOrder,
        performance: this.calculatePerformanceScore(periodPayments),
        breakdown: this.createEarningsBreakdown(periodPayments)
      };

    } catch (error) {
      this.logger.error('Error calculating driver earnings:', error);
      throw error;
    }
  }

  // AI-powered dynamic commission calculation
  async calculateDynamicCommission(orderData: any, driverPerformance: any): Promise<number> {
    try {
      const baseRate = this.defaultSettings.defaultCommissionRate;
      let dynamicRate = baseRate;

      // Performance bonus
      if (driverPerformance.rating >= 4.8) {
        dynamicRate += 2; // +2% for excellent drivers
      } else if (driverPerformance.rating >= 4.5) {
        dynamicRate += 1; // +1% for good drivers
      }

      // Order value bonus
      const orderValue = orderData.price || 0;
      if (orderValue >= 1000000) { // 1M+ UZS orders
        dynamicRate += 1.5;
      }

      // Distance bonus
      const distance = this.calculateDistance(orderData.fromCity, orderData.toCity);
      if (distance >= 500) { // 500+ km
        dynamicRate += 1;
      }

      // Peak time bonus
      const hour = new Date().getHours();
      if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
        dynamicRate += 0.5; // Peak hours bonus
      }

      // Minimum and maximum limits
      dynamicRate = Math.max(5, Math.min(20, dynamicRate));

      this.logger.log(`🧠 AI Dynamic commission: ${dynamicRate}% (base: ${baseRate}%)`);
      return dynamicRate;

    } catch (error) {
      this.logger.error('Error calculating dynamic commission:', error);
      return this.defaultSettings.defaultCommissionRate;
    }
  }

  private async savePayment(payment: DriverPayment): Promise<void> {
    const payments = await this.loadPayments();
    payments.push(payment);
    await this.savePayments(payments);
  }

  private async loadPayments(): Promise<DriverPayment[]> {
    try {
      if (!fs.existsSync(this.paymentsFilePath)) {
        return [];
      }
      const data = fs.readFileSync(this.paymentsFilePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      this.logger.warn('Error loading payments, returning empty array');
      return [];
    }
  }

  private async savePayments(payments: DriverPayment[]): Promise<void> {
    fs.writeFileSync(this.paymentsFilePath, JSON.stringify(payments, null, 2));
  }

  private async updateDriverBalance(driverId: number, payment: DriverPayment): Promise<void> {
    try {
      const balances = await this.loadBalances();
      const balanceIndex = balances.findIndex(b => b.driverId === driverId);

      if (balanceIndex === -1) {
        balances.push({
          driverId,
          totalEarnings: payment.netPayment,
          totalCommissions: payment.commissionAmount,
          pendingPayments: payment.status === 'pending' ? payment.netPayment : 0,
          completedPayments: payment.status === 'completed' ? payment.netPayment : 0,
          currentBalance: payment.status === 'completed' ? payment.netPayment : 0,
          lastPaymentDate: payment.status === 'completed' ? payment.paymentDate : '',
          nextPaymentDate: this.calculateNextPaymentDate()
        });
      } else {
        const balance = balances[balanceIndex];
        balance.totalEarnings += payment.netPayment;
        balance.totalCommissions += payment.commissionAmount;

        if (payment.status === 'pending') {
          balance.pendingPayments += payment.netPayment;
        } else if (payment.status === 'completed') {
          balance.completedPayments += payment.netPayment;
          balance.currentBalance += payment.netPayment;
          balance.lastPaymentDate = payment.paymentDate;
        }
      }

      await this.saveBalances(balances);

    } catch (error) {
      this.logger.error('Error updating driver balance:', error);
    }
  }

  private async loadBalances(): Promise<DriverBalance[]> {
    try {
      if (!fs.existsSync(this.balancesFilePath)) {
        return [];
      }
      const data = fs.readFileSync(this.balancesFilePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  private async saveBalances(balances: DriverBalance[]): Promise<void> {
    fs.writeFileSync(this.balancesFilePath, JSON.stringify(balances, null, 2));
  }

  private async getPaymentSettings(): Promise<PaymentSettings> {
    try {
      if (!fs.existsSync(this.settingsFilePath)) {
        await this.savePaymentSettings(this.defaultSettings);
        return this.defaultSettings;
      }
      const data = fs.readFileSync(this.settingsFilePath, 'utf8');
      return { ...this.defaultSettings, ...JSON.parse(data) };
    } catch (error) {
      return this.defaultSettings;
    }
  }

  private async savePaymentSettings(settings: PaymentSettings): Promise<void> {
    fs.writeFileSync(this.settingsFilePath, JSON.stringify(settings, null, 2));
  }

  private async generateInvoiceNumber(): Promise<string> {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${timestamp}-${random}`;
  }

  private calculateFuelCost(orderData: any): number {
    // AI-powered fuel cost calculation
    const distance = this.calculateDistance(orderData.fromCity, orderData.toCity);
    const fuelPricePerKm = 1200; // 1200 UZS per km (average)
    return Math.round(distance * fuelPricePerKm);
  }

  private calculateBonus(orderData: any): number {
    // Performance-based bonus calculation
    const orderValue = orderData.price || 0;
    if (orderValue >= 2000000) { // 2M+ UZS orders get bonus
      return Math.round(orderValue * 0.005); // 0.5% bonus
    }
    return 0;
  }

  private calculateDistance(fromCity: string, toCity: string): number {
    // Simplified distance calculation (in real app, use Google Maps API)
    const distances: { [key: string]: number } = {
      'Toshkent-Samarqand': 280,
      'Toshkent-Buxoro': 440,
      'Toshkent-Andijon': 320,
      'Toshkent-Fargona': 300,
      'Samarqand-Buxoro': 160,
      'Andijon-Fargona': 40,
    };

    const key = `${fromCity}-${toCity}`;
    const reverseKey = `${toCity}-${fromCity}`;

    return distances[key] || distances[reverseKey] || 200; // Default 200km
  }

  private calculateNextPaymentDate(): string {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return nextWeek.toISOString();
  }

  private getPerionStartDate(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'today':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'year':
        return new Date(now.getFullYear(), 0, 1);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  private calculatePerformanceScore(payments: DriverPayment[]): number {
    if (payments.length === 0) return 0;

    const totalOrders = payments.length;
    const avgValue = payments.reduce((sum, p) => sum + p.orderAmount, 0) / totalOrders;
    const completionRate = payments.filter(p => p.status === 'completed').length / totalOrders;

    return Math.round((avgValue / 100000) * completionRate * 100);
  }

  private createEarningsBreakdown(payments: DriverPayment[]): any {
    return {
      byPaymentMethod: this.groupBy(payments, 'paymentMethod'),
      byMonth: this.groupByMonth(payments),
      byOrderValue: this.groupByOrderValue(payments)
    };
  }

  private groupBy(array: any[], key: string): any {
    return array.reduce((result, item) => {
      const group = item[key] || 'unknown';
      result[group] = (result[group] || 0) + item.netPayment;
      return result;
    }, {});
  }

  private groupByMonth(payments: DriverPayment[]): any {
    return payments.reduce((result, payment) => {
      const month = new Date(payment.createdAt).toISOString().substring(0, 7);
      result[month] = (result[month] || 0) + payment.netPayment;
      return result;
    }, {});
  }

  private groupByOrderValue(payments: DriverPayment[]): any {
    const ranges = {
      'under_500k': 0,
      '500k_1m': 0,
      '1m_2m': 0,
      'over_2m': 0
    };

    payments.forEach(payment => {
      const value = payment.orderAmount;
      if (value < 500000) ranges.under_500k += payment.netPayment;
      else if (value < 1000000) ranges['500k_1m'] += payment.netPayment;
      else if (value < 2000000) ranges['1m_2m'] += payment.netPayment;
      else ranges.over_2m += payment.netPayment;
    });

    return ranges;
  }
}