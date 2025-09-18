import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { CommissionService } from './commission.service';

@Controller('api/commission')
export class CommissionController {
    constructor(private readonly commissionService: CommissionService) {}

    @Get('rates')
    async getCommissionRates() {
        try {
            const rates = await this.commissionService.getCurrentRates();
            return {
                success: true,
                data: rates
            };
        } catch (error) {
            return {
                success: false,
                message: 'Komissiya sozlamalarini olishda xatolik',
                error: error.message
            };
        }
    }

    @Put('rates')
    async updateCommissionRates(@Body() rates: { standard: number; premium: number }) {
        try {
            await this.commissionService.updateRates(rates.standard, rates.premium);
            return {
                success: true,
                message: 'Komissiya sozlamalari yangilandi',
                data: rates
            };
        } catch (error) {
            return {
                success: false,
                message: 'Komissiya sozlamalarini yangilashda xatolik',
                error: error.message
            };
        }
    }

    @Get('drivers')
    async getDriverCommissions() {
        try {
            const drivers = await this.commissionService.getDriverCommissions();
            return {
                success: true,
                data: drivers
            };
        } catch (error) {
            return {
                success: false,
                message: 'Haydovchi komissiyalarini olishda xatolik',
                error: error.message
            };
        }
    }

    @Post('calculate')
    async calculateCommission(@Body() data: { driverId: string; amount: number }) {
        try {
            const commission = await this.commissionService.calculateCommission(data.driverId, data.amount);
            return {
                success: true,
                data: commission
            };
        } catch (error) {
            return {
                success: false,
                message: 'Komissiya hisoblashda xatolik',
                error: error.message
            };
        }
    }

    @Post('apply/:driverId')
    async applyCommission(@Param('driverId') driverId: string, @Body() data: { amount: number; orderId: string }) {
        try {
            const result = await this.commissionService.applyCommission(driverId, data.amount, data.orderId);
            return {
                success: true,
                message: 'Komissiya muvaffaqiyatli qo\'llandi',
                data: result
            };
        } catch (error) {
            return {
                success: false,
                message: 'Komissiya qo\'llashda xatolik',
                error: error.message
            };
        }
    }
}