import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { DriverPaymentsService } from './driver-payments.service';

@Controller('api/driver-payments')
export class DriverPaymentsController {
    constructor(private readonly driverPaymentsService: DriverPaymentsService) {}

    @Get()
    async getAllDriverBalances() {
        try {
            const balances = await this.driverPaymentsService.getAllDriverBalances();
            return {
                success: true,
                data: balances
            };
        } catch (error) {
            return {
                success: false,
                message: 'Haydovchi balanslarini olishda xatolik',
                error: error.message
            };
        }
    }

    @Get(':driverId/balance')
    async getDriverBalance(@Param('driverId') driverId: string) {
        try {
            const balance = await this.driverPaymentsService.getDriverBalance(driverId);
            return {
                success: true,
                data: balance
            };
        } catch (error) {
            return {
                success: false,
                message: 'Haydovchi balansini olishda xatolik',
                error: error.message
            };
        }
    }

    @Post(':driverId/payment')
    async processPayment(@Param('driverId') driverId: string, @Body() data: { amount: number; note?: string }) {
        try {
            const result = await this.driverPaymentsService.processPayment(driverId, data.amount, data.note);
            return {
                success: true,
                message: `${data.amount.toLocaleString()} so'm to'lov muvaffaqiyatli amalga oshirildi`,
                data: result
            };
        } catch (error) {
            return {
                success: false,
                message: 'To\'lovni amalga oshirishda xatolik',
                error: error.message
            };
        }
    }

    @Get(':driverId/history')
    async getPaymentHistory(@Param('driverId') driverId: string, @Query('limit') limit = 50) {
        try {
            const history = await this.driverPaymentsService.getPaymentHistory(driverId, parseInt(limit.toString()));
            return {
                success: true,
                data: history
            };
        } catch (error) {
            return {
                success: false,
                message: 'To\'lov tarixini olishda xatolik',
                error: error.message
            };
        }
    }

    @Post(':driverId/withdraw')
    async withdrawMoney(@Param('driverId') driverId: string, @Body() data: { amount: number; method: string; account?: string }) {
        try {
            const result = await this.driverPaymentsService.withdrawMoney(driverId, data.amount, data.method, data.account);
            return {
                success: true,
                message: 'Pul yechish so\'rovi qabul qilindi',
                data: result
            };
        } catch (error) {
            return {
                success: false,
                message: 'Pul yechishda xatolik',
                error: error.message
            };
        }
    }

    @Get('statistics')
    async getPaymentStatistics() {
        try {
            const stats = await this.driverPaymentsService.getPaymentStatistics();
            return {
                success: true,
                data: stats
            };
        } catch (error) {
            return {
                success: false,
                message: 'Statistikani olishda xatolik',
                error: error.message
            };
        }
    }

    @Post('bulk-payment')
    async processBulkPayment(@Body() data: { payments: Array<{ driverId: string; amount: number; note?: string }> }) {
        try {
            const results = await this.driverPaymentsService.processBulkPayment(data.payments);
            return {
                success: true,
                message: `${data.payments.length} ta haydovchiga to'lov amalga oshirildi`,
                data: results
            };
        } catch (error) {
            return {
                success: false,
                message: 'Ommaviy to\'lovni amalga oshirishda xatolik',
                error: error.message
            };
        }
    }
}