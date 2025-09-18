import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { CommissionService } from './commission.service';
import { CommissionRule } from './interfaces/commission.interfaces';

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

    // New flexible commission endpoints
    @Get('rules')
    async getAllCommissionRules() {
        try {
            const rules = await this.commissionService.getAllCommissionRules();
            return {
                success: true,
                data: rules
            };
        } catch (error) {
            return {
                success: false,
                message: 'Komissiya qoidalarini olishda xatolik',
                error: error.message
            };
        }
    }

    @Post('rules')
    async createCommissionRule(@Body() ruleData: Partial<CommissionRule>) {
        try {
            const rule = await this.commissionService.createCommissionRule(ruleData);
            return {
                success: true,
                message: 'Komissiya qoidasi yaratildi',
                data: rule
            };
        } catch (error) {
            return {
                success: false,
                message: 'Komissiya qoidasini yaratishda xatolik',
                error: error.message
            };
        }
    }

    @Put('rules/:ruleId')
    async updateCommissionRule(@Param('ruleId') ruleId: string, @Body() updateData: Partial<CommissionRule>) {
        try {
            const rule = await this.commissionService.updateCommissionRule(ruleId, updateData);
            return {
                success: true,
                message: 'Komissiya qoidasi yangilandi',
                data: rule
            };
        } catch (error) {
            return {
                success: false,
                message: 'Komissiya qoidasini yangilashda xatolik',
                error: error.message
            };
        }
    }

    @Delete('rules/:ruleId')
    async deleteCommissionRule(@Param('ruleId') ruleId: string) {
        try {
            await this.commissionService.deleteCommissionRule(ruleId);
            return {
                success: true,
                message: 'Komissiya qoidasi o\'chirildi'
            };
        } catch (error) {
            return {
                success: false,
                message: 'Komissiya qoidasini o\'chirishda xatolik',
                error: error.message
            };
        }
    }

    @Put('rules/:ruleId/set-default')
    async setDefaultRule(@Param('ruleId') ruleId: string) {
        try {
            await this.commissionService.setDefaultRule(ruleId);
            return {
                success: true,
                message: 'Asosiy qoida o\'rnatildi'
            };
        } catch (error) {
            return {
                success: false,
                message: 'Asosiy qoidani o\'rnatishda xatolik',
                error: error.message
            };
        }
    }

    @Post('calculate-flexible')
    async calculateFlexibleCommission(@Body() data: {
        driverId: string;
        amount: number;
        orderData?: {
            orderType?: string;
            region?: string;
            orderTime?: string;
            orderId?: string;
        }
    }) {
        try {
            const calculation = await this.commissionService.calculateFlexibleCommission(
                data.driverId,
                data.amount,
                data.orderData
            );
            return {
                success: true,
                data: calculation
            };
        } catch (error) {
            return {
                success: false,
                message: 'Komissiya hisoblashda xatolik',
                error: error.message
            };
        }
    }
}