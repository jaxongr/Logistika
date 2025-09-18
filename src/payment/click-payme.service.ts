import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface PaymentRequest {
  orderId: string;
  amount: number;
  description: string;
  customerPhone: string;
  customerName?: string;
  returnUrl?: string;
  callbackUrl?: string;
  method: 'click' | 'payme';
}

export interface PaymentResponse {
  transactionId: string;
  paymentUrl?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  amount: number;
  commission: number;
  netAmount: number;
  method: string;
  createdAt: string;
  expiresAt: string;
}

export interface TransactionStatus {
  transactionId: string;
  orderId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  amount: number;
  commission: number;
  netAmount: number;
  method: string;
  customerPhone: string;
  createdAt: string;
  completedAt?: string;
  failedReason?: string;
  gatewayResponse?: any;
}

@Injectable()
export class ClickPaymeService {
  private readonly logger = new Logger(ClickPaymeService.name);
  private readonly transactionsPath = path.join(process.cwd(), 'payment-transactions.json');

  // Click configuration
  private readonly clickConfig = {
    merchantId: process.env.CLICK_MERCHANT_ID || 'test_merchant',
    serviceId: process.env.CLICK_SERVICE_ID || 'test_service',
    secretKey: process.env.CLICK_SECRET_KEY || 'test_secret_key',
    baseUrl: process.env.CLICK_BASE_URL || 'https://api.click.uz/v2',
    commission: 0.5 // 0.5% commission
  };

  // Payme configuration
  private readonly paymeConfig = {
    merchantId: process.env.PAYME_MERCHANT_ID || 'test_merchant',
    login: process.env.PAYME_LOGIN || 'Paycom',
    key: process.env.PAYME_KEY || 'test_key',
    baseUrl: process.env.PAYME_BASE_URL || 'https://checkout.paycom.uz',
    commission: 0.8 // 0.8% commission
  };

  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      this.logger.log(`💳 Initiating ${request.method.toUpperCase()} payment for order: ${request.orderId}`);

      const transactionId = this.generateTransactionId();

      let paymentResponse: PaymentResponse;

      if (request.method === 'click') {
        paymentResponse = await this.initiateClickPayment(request, transactionId);
      } else if (request.method === 'payme') {
        paymentResponse = await this.initiatePaymePayment(request, transactionId);
      } else {
        throw new Error('Unsupported payment method');
      }

      // Save transaction
      await this.saveTransaction({
        transactionId,
        orderId: request.orderId,
        status: 'pending',
        amount: request.amount,
        commission: paymentResponse.commission,
        netAmount: paymentResponse.netAmount,
        method: request.method,
        customerPhone: request.customerPhone,
        createdAt: new Date().toISOString()
      });

      this.logger.log(`✅ Payment initiated: ${transactionId} (${request.method.toUpperCase()})`);
      return paymentResponse;

    } catch (error) {
      this.logger.error('Payment initiation error:', error);
      throw error;
    }
  }

  async checkPaymentStatus(transactionId: string): Promise<TransactionStatus> {
    try {
      const transaction = await this.getTransaction(transactionId);

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Check with payment gateway
      let gatewayStatus;

      if (transaction.method === 'click') {
        gatewayStatus = await this.checkClickStatus(transactionId);
      } else if (transaction.method === 'payme') {
        gatewayStatus = await this.checkPaymeStatus(transactionId);
      }

      // Update transaction status if changed
      if (gatewayStatus && gatewayStatus.status !== transaction.status) {
        transaction.status = gatewayStatus.status;
        transaction.gatewayResponse = gatewayStatus;

        if (gatewayStatus.status === 'completed') {
          transaction.completedAt = new Date().toISOString();
        } else if (gatewayStatus.status === 'failed') {
          transaction.failedReason = gatewayStatus.reason || 'Payment failed';
        }

        await this.updateTransaction(transaction);
      }

      return transaction;

    } catch (error) {
      this.logger.error('Payment status check error:', error);
      throw error;
    }
  }

  async processCallback(method: 'click' | 'payme', callbackData: any): Promise<any> {
    try {
      this.logger.log(`📞 Processing ${method.toUpperCase()} callback`);

      if (method === 'click') {
        return await this.processClickCallback(callbackData);
      } else if (method === 'payme') {
        return await this.processPaymeCallback(callbackData);
      }

      throw new Error('Unsupported callback method');

    } catch (error) {
      this.logger.error('Callback processing error:', error);
      throw error;
    }
  }

  async cancelPayment(transactionId: string, reason?: string): Promise<boolean> {
    try {
      const transaction = await this.getTransaction(transactionId);

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.status === 'completed') {
        throw new Error('Cannot cancel completed payment');
      }

      // Cancel with payment gateway
      let cancelled = false;

      if (transaction.method === 'click') {
        cancelled = await this.cancelClickPayment(transactionId);
      } else if (transaction.method === 'payme') {
        cancelled = await this.cancelPaymePayment(transactionId);
      }

      if (cancelled) {
        transaction.status = 'cancelled';
        transaction.failedReason = reason || 'Payment cancelled by user';
        await this.updateTransaction(transaction);
      }

      return cancelled;

    } catch (error) {
      this.logger.error('Payment cancellation error:', error);
      throw error;
    }
  }

  async getPaymentHistory(filters?: {
    method?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }): Promise<TransactionStatus[]> {
    try {
      const transactions = await this.loadTransactions();
      let filtered = transactions;

      if (filters) {
        if (filters.method) {
          filtered = filtered.filter(t => t.method === filters.method);
        }

        if (filters.status) {
          filtered = filtered.filter(t => t.status === filters.status);
        }

        if (filters.dateFrom) {
          filtered = filtered.filter(t => new Date(t.createdAt) >= new Date(filters.dateFrom));
        }

        if (filters.dateTo) {
          filtered = filtered.filter(t => new Date(t.createdAt) <= new Date(filters.dateTo));
        }

        if (filters.limit) {
          filtered = filtered.slice(0, filters.limit);
        }
      }

      return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    } catch (error) {
      this.logger.error('Error loading payment history:', error);
      return [];
    }
  }

  async getPaymentAnalytics(period: string): Promise<any> {
    try {
      const transactions = await this.loadTransactions();
      const startDate = this.getPeriodStartDate(period);

      const periodTransactions = transactions.filter(t =>
        new Date(t.createdAt) >= startDate
      );

      const analytics = {
        totalTransactions: periodTransactions.length,
        totalAmount: periodTransactions.reduce((sum, t) => sum + t.amount, 0),
        totalCommission: periodTransactions.reduce((sum, t) => sum + t.commission, 0),
        totalNetAmount: periodTransactions.reduce((sum, t) => sum + t.netAmount, 0),
        successRate: this.calculateSuccessRate(periodTransactions),
        methodBreakdown: this.calculateMethodBreakdown(periodTransactions),
        statusBreakdown: this.calculateStatusBreakdown(periodTransactions),
        averageAmount: this.calculateAverageAmount(periodTransactions),
        peakHours: this.calculatePeakHours(periodTransactions),
        failureReasons: this.analyzeFailureReasons(periodTransactions)
      };

      return analytics;

    } catch (error) {
      this.logger.error('Error calculating payment analytics:', error);
      throw error;
    }
  }

  // Click payment methods
  private async initiateClickPayment(request: PaymentRequest, transactionId: string): Promise<PaymentResponse> {
    const commission = Math.round(request.amount * (this.clickConfig.commission / 100));
    const netAmount = request.amount - commission;

    // In production, integrate with actual Click API
    // For now, return mock response
    const paymentUrl = this.generateClickPaymentUrl(request, transactionId);

    return {
      transactionId,
      paymentUrl,
      status: 'pending',
      amount: request.amount,
      commission,
      netAmount,
      method: 'click',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
    };
  }

  private generateClickPaymentUrl(request: PaymentRequest, transactionId: string): string {
    const params = new URLSearchParams({
      service_id: this.clickConfig.serviceId,
      merchant_id: this.clickConfig.merchantId,
      amount: request.amount.toString(),
      transaction_param: transactionId,
      return_url: request.returnUrl || 'https://avtohabar.uz/payment/success',
      merchant_user_id: request.customerPhone
    });

    return `${this.clickConfig.baseUrl}/services/pay?${params.toString()}`;
  }

  private async checkClickStatus(transactionId: string): Promise<any> {
    // In production, integrate with Click API to check transaction status
    // For now, simulate random status updates
    const statuses = ['pending', 'processing', 'completed', 'failed'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

    return {
      status: randomStatus,
      timestamp: new Date().toISOString()
    };
  }

  private async processClickCallback(callbackData: any): Promise<any> {
    try {
      // Verify Click signature
      const isValidSignature = this.verifyClickSignature(callbackData);

      if (!isValidSignature) {
        throw new Error('Invalid signature');
      }

      const transactionId = callbackData.merchant_trans_id;
      const transaction = await this.getTransaction(transactionId);

      if (!transaction) {
        return { error: -5, error_note: 'Transaction not found' };
      }

      // Update transaction status based on callback
      transaction.status = this.mapClickStatus(callbackData.action) as any;
      transaction.gatewayResponse = callbackData;

      if (transaction.status === 'completed') {
        transaction.completedAt = new Date().toISOString();
      }

      await this.updateTransaction(transaction);

      return { click_trans_id: callbackData.click_trans_id, error: 0, error_note: 'Success' };

    } catch (error) {
      this.logger.error('Click callback processing error:', error);
      return { error: -1, error_note: 'Internal error' };
    }
  }

  private verifyClickSignature(data: any): boolean {
    // In production, implement proper signature verification
    return true;
  }

  private mapClickStatus(action: number): string {
    switch (action) {
      case 0: return 'pending';
      case 1: return 'completed';
      case -1: return 'failed';
      case -2: return 'cancelled';
      default: return 'pending';
    }
  }

  private async cancelClickPayment(transactionId: string): Promise<boolean> {
    // In production, make API call to Cancel Click payment
    return true;
  }

  // Payme payment methods
  private async initiatePaymePayment(request: PaymentRequest, transactionId: string): Promise<PaymentResponse> {
    const commission = Math.round(request.amount * (this.paymeConfig.commission / 100));
    const netAmount = request.amount - commission;

    // In production, integrate with actual Payme API
    const paymentUrl = this.generatePaymePaymentUrl(request, transactionId);

    return {
      transactionId,
      paymentUrl,
      status: 'pending',
      amount: request.amount,
      commission,
      netAmount,
      method: 'payme',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
    };
  }

  private generatePaymePaymentUrl(request: PaymentRequest, transactionId: string): string {
    const orderData = {
      m: this.paymeConfig.merchantId,
      ac: {
        order_id: request.orderId,
        transaction_id: transactionId
      },
      a: request.amount * 100, // Payme amount in tiyin
      c: request.returnUrl || 'https://avtohabar.uz/payment/success'
    };

    const encoded = Buffer.from(JSON.stringify(orderData)).toString('base64');
    return `${this.paymeConfig.baseUrl}/${encoded}`;
  }

  private async checkPaymeStatus(transactionId: string): Promise<any> {
    // In production, integrate with Payme API to check transaction status
    // For now, simulate random status updates
    const statuses = ['pending', 'processing', 'completed', 'failed'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

    return {
      status: randomStatus,
      timestamp: new Date().toISOString()
    };
  }

  private async processPaymeCallback(callbackData: any): Promise<any> {
    try {
      // Process Payme JSON-RPC callback
      const method = callbackData.method;

      switch (method) {
        case 'CheckPerformTransaction':
          return await this.handlePaymeCheckPerformTransaction(callbackData.params);
        case 'CreateTransaction':
          return await this.handlePaymeCreateTransaction(callbackData.params);
        case 'PerformTransaction':
          return await this.handlePaymePerformTransaction(callbackData.params);
        case 'CancelTransaction':
          return await this.handlePaymeCancelTransaction(callbackData.params);
        case 'CheckTransaction':
          return await this.handlePaymeCheckTransaction(callbackData.params);
        default:
          throw new Error('Unknown method');
      }

    } catch (error) {
      this.logger.error('Payme callback processing error:', error);
      return {
        error: {
          code: -32400,
          message: 'Internal error'
        }
      };
    }
  }

  private async handlePaymeCheckPerformTransaction(params: any): Promise<any> {
    // Validate transaction parameters
    const orderId = params.account.order_id;
    const amount = params.amount;

    // Check if order exists and amount is correct
    // Return success if valid
    return { allow: true };
  }

  private async handlePaymeCreateTransaction(params: any): Promise<any> {
    const transactionId = params.account.transaction_id;
    const transaction = await this.getTransaction(transactionId);

    if (transaction) {
      transaction.status = 'processing';
      await this.updateTransaction(transaction);

      return {
        transaction: transactionId,
        state: 1,
        create_time: Date.now()
      };
    }

    throw new Error('Transaction not found');
  }

  private async handlePaymePerformTransaction(params: any): Promise<any> {
    const transactionId = params.id;
    const transaction = await this.getTransaction(transactionId);

    if (transaction) {
      transaction.status = 'completed';
      transaction.completedAt = new Date().toISOString();
      await this.updateTransaction(transaction);

      return {
        transaction: transactionId,
        state: 2,
        perform_time: Date.now()
      };
    }

    throw new Error('Transaction not found');
  }

  private async handlePaymeCancelTransaction(params: any): Promise<any> {
    const transactionId = params.id;
    const transaction = await this.getTransaction(transactionId);

    if (transaction) {
      transaction.status = 'cancelled';
      transaction.failedReason = 'Cancelled by Payme';
      await this.updateTransaction(transaction);

      return {
        transaction: transactionId,
        state: -1,
        cancel_time: Date.now()
      };
    }

    throw new Error('Transaction not found');
  }

  private async handlePaymeCheckTransaction(params: any): Promise<any> {
    const transactionId = params.id;
    const transaction = await this.getTransaction(transactionId);

    if (transaction) {
      return {
        transaction: transactionId,
        state: this.mapPaymeState(transaction.status),
        create_time: new Date(transaction.createdAt).getTime(),
        perform_time: transaction.completedAt ? new Date(transaction.completedAt).getTime() : 0
      };
    }

    throw new Error('Transaction not found');
  }

  private mapPaymeState(status: string): number {
    switch (status) {
      case 'pending': return 0;
      case 'processing': return 1;
      case 'completed': return 2;
      case 'cancelled': return -1;
      case 'failed': return -2;
      default: return 0;
    }
  }

  private async cancelPaymePayment(transactionId: string): Promise<boolean> {
    // In production, make API call to cancel Payme payment
    return true;
  }

  // Utility methods
  private generateTransactionId(): string {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `TXN${timestamp}${random}`;
  }

  private calculateSuccessRate(transactions: TransactionStatus[]): number {
    if (transactions.length === 0) return 0;
    const successful = transactions.filter(t => t.status === 'completed').length;
    return Math.round((successful / transactions.length) * 100);
  }

  private calculateMethodBreakdown(transactions: TransactionStatus[]): any {
    const breakdown = { click: 0, payme: 0 };

    transactions.forEach(t => {
      breakdown[t.method] = (breakdown[t.method] || 0) + 1;
    });

    return breakdown;
  }

  private calculateStatusBreakdown(transactions: TransactionStatus[]): any {
    const breakdown = { pending: 0, processing: 0, completed: 0, failed: 0, cancelled: 0 };

    transactions.forEach(t => {
      breakdown[t.status] = (breakdown[t.status] || 0) + 1;
    });

    return breakdown;
  }

  private calculateAverageAmount(transactions: TransactionStatus[]): number {
    if (transactions.length === 0) return 0;
    const total = transactions.reduce((sum, t) => sum + t.amount, 0);
    return Math.round(total / transactions.length);
  }

  private calculatePeakHours(transactions: TransactionStatus[]): any {
    const hourlyData: { [hour: string]: number } = {};

    transactions.forEach(t => {
      const hour = new Date(t.createdAt).getHours().toString().padStart(2, '0');
      hourlyData[hour] = (hourlyData[hour] || 0) + 1;
    });

    return Object.entries(hourlyData)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour, count]) => ({ hour: `${hour}:00`, count }));
  }

  private analyzeFailureReasons(transactions: TransactionStatus[]): any {
    const failed = transactions.filter(t => t.status === 'failed' || t.status === 'cancelled');
    const reasons: { [reason: string]: number } = {};

    failed.forEach(t => {
      const reason = t.failedReason || 'Unknown';
      reasons[reason] = (reasons[reason] || 0) + 1;
    });

    return Object.entries(reasons)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count }));
  }

  private getPeriodStartDate(period: string): Date {
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

  // File operations
  private async loadTransactions(): Promise<TransactionStatus[]> {
    try {
      if (!fs.existsSync(this.transactionsPath)) {
        return [];
      }
      const data = fs.readFileSync(this.transactionsPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  private async saveTransaction(transaction: TransactionStatus): Promise<void> {
    try {
      const transactions = await this.loadTransactions();
      transactions.push(transaction);
      fs.writeFileSync(this.transactionsPath, JSON.stringify(transactions, null, 2));
    } catch (error) {
      this.logger.error('Error saving transaction:', error);
    }
  }

  private async updateTransaction(updatedTransaction: TransactionStatus): Promise<void> {
    try {
      const transactions = await this.loadTransactions();
      const index = transactions.findIndex(t => t.transactionId === updatedTransaction.transactionId);

      if (index !== -1) {
        transactions[index] = updatedTransaction;
        fs.writeFileSync(this.transactionsPath, JSON.stringify(transactions, null, 2));
      }
    } catch (error) {
      this.logger.error('Error updating transaction:', error);
    }
  }

  private async getTransaction(transactionId: string): Promise<TransactionStatus | null> {
    try {
      const transactions = await this.loadTransactions();
      return transactions.find(t => t.transactionId === transactionId) || null;
    } catch (error) {
      return null;
    }
  }
}