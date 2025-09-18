import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpException,
  Headers
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { DriverPaymentService } from './driver-payment.service';
import { ClickPaymeService, PaymentRequest } from './click-payme.service';

@Controller('api/payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly driverPaymentService: DriverPaymentService,
    private readonly clickPaymeService: ClickPaymeService
  ) {}

  // Customer Payments
  @Post('initiate')
  async initiatePayment(@Body() paymentData: PaymentRequest) {
    try {
      const payment = await this.clickPaymeService.initiatePayment(paymentData);

      return {
        success: true,
        data: payment,
        message: 'Payment initiated successfully'
      };
    } catch (error) {
      throw new HttpException({
        success: false,
        message: 'Failed to initiate payment',
        error: error.message
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('status/:transactionId')
  async getPaymentStatus(@Param('transactionId') transactionId: string) {
    try {
      const status = await this.clickPaymeService.checkPaymentStatus(transactionId);

      return {
        success: true,
        data: status,
        message: 'Payment status retrieved successfully'
      };
    } catch (error) {
      const status = error.message === 'Transaction not found' ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({
        success: false,
        message: error.message,
        error: error.message
      }, status);
    }
  }

  @Post('cancel/:transactionId')
  async cancelPayment(@Param('transactionId') transactionId: string, @Body() cancelData: { reason?: string }) {
    try {
      const cancelled = await this.clickPaymeService.cancelPayment(transactionId, cancelData.reason);

      return {
        success: cancelled,
        message: cancelled ? 'Payment cancelled successfully' : 'Failed to cancel payment'
      };
    } catch (error) {
      throw new HttpException({
        success: false,
        message: error.message,
        error: error.message
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('history')
  async getPaymentHistory(@Query() query: any) {
    try {
      const filters = {
        method: query.method,
        status: query.status,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        limit: query.limit ? parseInt(query.limit) : undefined
      };

      const history = await this.clickPaymeService.getPaymentHistory(filters);

      return {
        success: true,
        data: history,
        total: history.length,
        message: 'Payment history retrieved successfully'
      };
    } catch (error) {
      throw new HttpException({
        success: false,
        message: 'Failed to retrieve payment history',
        error: error.message
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('analytics')
  async getPaymentAnalytics(@Query('period') period: string = 'month') {
    try {
      const analytics = await this.clickPaymeService.getPaymentAnalytics(period);

      return {
        success: true,
        data: analytics,
        period,
        message: 'Payment analytics retrieved successfully'
      };
    } catch (error) {
      throw new HttpException({
        success: false,
        message: 'Failed to retrieve payment analytics',
        error: error.message
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Driver Payments
  @Get('drivers/:driverId')
  async getDriverPayments(@Param('driverId') driverId: string) {
    try {
      const payments = await this.driverPaymentService.getDriverPayments(parseInt(driverId));

      return {
        success: true,
        data: payments,
        total: payments.length,
        message: 'Driver payments retrieved successfully'
      };
    } catch (error) {
      throw new HttpException({
        success: false,
        message: 'Failed to retrieve driver payments',
        error: error.message
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('drivers/:driverId/balance')
  async getDriverBalance(@Param('driverId') driverId: string) {
    try {
      const balance = await this.driverPaymentService.getDriverBalance(parseInt(driverId));

      return {
        success: true,
        data: balance,
        message: 'Driver balance retrieved successfully'
      };
    } catch (error) {
      throw new HttpException({
        success: false,
        message: 'Failed to retrieve driver balance',
        error: error.message
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('drivers/:driverId/earnings/:period')
  async getDriverEarnings(@Param('driverId') driverId: string, @Param('period') period: string) {
    try {
      const earnings = await this.driverPaymentService.calculateDriverEarnings(parseInt(driverId), period);

      return {
        success: true,
        data: earnings,
        message: 'Driver earnings retrieved successfully'
      };
    } catch (error) {
      throw new HttpException({
        success: false,
        message: 'Failed to calculate driver earnings',
        error: error.message
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('drivers/process/:paymentId')
  async processDriverPayment(@Param('paymentId') paymentId: string, @Body() processData: { paymentMethod: string }) {
    try {
      const processed = await this.driverPaymentService.processPayment(paymentId, processData.paymentMethod);

      return {
        success: processed,
        message: processed ? 'Payment processed successfully' : 'Failed to process payment'
      };
    } catch (error) {
      throw new HttpException({
        success: false,
        message: error.message,
        error: error.message
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('drivers/:driverId/commission')
  async calculateDynamicCommission(@Param('driverId') driverId: string, @Body() orderData: any) {
    try {
      // Mock driver performance data - in production, get from database
      const driverPerformance = {
        rating: 4.7,
        completedOrders: 156,
        averageDeliveryTime: 45
      };

      const commission = await this.driverPaymentService.calculateDynamicCommission(orderData, driverPerformance);

      return {
        success: true,
        data: {
          driverId: parseInt(driverId),
          orderId: orderData.id,
          baseCommission: 10,
          dynamicCommission: commission,
          improvement: commission - 10
        },
        message: 'Dynamic commission calculated successfully'
      };
    } catch (error) {
      throw new HttpException({
        success: false,
        message: 'Failed to calculate dynamic commission',
        error: error.message
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Payment Gateway Callbacks
  @Post('callback/click')
  async clickCallback(@Body() callbackData: any, @Headers() headers: any) {
    try {
      const response = await this.clickPaymeService.processCallback('click', callbackData);

      return response;
    } catch (error) {
      return {
        error: -1,
        error_note: 'Internal error'
      };
    }
  }

  @Post('callback/payme')
  async paymeCallback(@Body() callbackData: any, @Headers() headers: any) {
    try {
      const response = await this.clickPaymeService.processCallback('payme', callbackData);

      return response;
    } catch (error) {
      return {
        error: {
          code: -32400,
          message: 'Internal error'
        }
      };
    }
  }

  // Payment Dashboard
  @Get('dashboard/overview')
  async getPaymentDashboard(@Query('period') period: string = 'month') {
    try {
      const paymentAnalytics = await this.clickPaymeService.getPaymentAnalytics(period);

      // Get driver payment statistics
      const driverPaymentStats = {
        totalDriverPayments: 0,
        pendingPayments: 0,
        totalCommissions: 0
      };

      // In production, calculate these from driver payment service
      // For now, return mock data

      const dashboard = {
        customerPayments: paymentAnalytics,
        driverPayments: driverPaymentStats,
        summary: {
          totalRevenue: paymentAnalytics.totalAmount,
          totalCommissions: paymentAnalytics.totalCommission + driverPaymentStats.totalCommissions,
          netRevenue: paymentAnalytics.totalNetAmount,
          transactionCount: paymentAnalytics.totalTransactions,
          successRate: paymentAnalytics.successRate
        }
      };

      return {
        success: true,
        data: dashboard,
        period,
        message: 'Payment dashboard retrieved successfully'
      };
    } catch (error) {
      throw new HttpException({
        success: false,
        message: 'Failed to retrieve payment dashboard',
        error: error.message
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('methods')
  async getSupportedPaymentMethods() {
    try {
      const methods = [
        {
          id: 'click',
          name: 'Click',
          description: 'Click to\'lov tizimi',
          icon: '/images/click-logo.png',
          commission: 0.5,
          minAmount: 1000,
          maxAmount: 50000000,
          supported: true
        },
        {
          id: 'payme',
          name: 'Payme',
          description: 'Payme to\'lov tizimi',
          icon: '/images/payme-logo.png',
          commission: 0.8,
          minAmount: 1000,
          maxAmount: 50000000,
          supported: true
        },
        {
          id: 'cash',
          name: 'Naqd',
          description: 'Naqd pul to\'lovi',
          icon: '/images/cash-icon.png',
          commission: 0,
          minAmount: 0,
          maxAmount: 100000000,
          supported: true
        }
      ];

      return {
        success: true,
        data: methods,
        message: 'Payment methods retrieved successfully'
      };
    } catch (error) {
      throw new HttpException({
        success: false,
        message: 'Failed to retrieve payment methods',
        error: error.message
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('simulate-success/:transactionId')
  async simulatePaymentSuccess(@Param('transactionId') transactionId: string) {
    try {
      // This is for testing purposes only - simulate successful payment
      const transactions = require('fs').existsSync('payment-transactions.json')
        ? JSON.parse(require('fs').readFileSync('payment-transactions.json', 'utf8'))
        : [];

      const transactionIndex = transactions.findIndex(t => t.transactionId === transactionId);

      if (transactionIndex === -1) {
        throw new Error('Transaction not found');
      }

      transactions[transactionIndex].status = 'completed';
      transactions[transactionIndex].completedAt = new Date().toISOString();

      require('fs').writeFileSync('payment-transactions.json', JSON.stringify(transactions, null, 2));

      return {
        success: true,
        message: 'Payment marked as successful (simulation)',
        data: transactions[transactionIndex]
      };
    } catch (error) {
      throw new HttpException({
        success: false,
        message: error.message,
        error: error.message
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('test-payment')
  async createTestPayment(@Body() testData: { amount: number; method: string; description?: string }) {
    try {
      const testPayment: PaymentRequest = {
        orderId: `TEST_${Date.now()}`,
        amount: testData.amount,
        description: testData.description || 'Test payment',
        customerPhone: '+998901234567',
        customerName: 'Test Customer',
        method: testData.method as 'click' | 'payme'
      };

      const payment = await this.clickPaymeService.initiatePayment(testPayment);

      return {
        success: true,
        data: payment,
        message: 'Test payment created successfully'
      };
    } catch (error) {
      throw new HttpException({
        success: false,
        message: 'Failed to create test payment',
        error: error.message
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}