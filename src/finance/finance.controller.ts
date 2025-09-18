import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { FinanceService } from './finance.service';

@Controller('api/finance')
export class FinanceController {
    constructor(private readonly financeService: FinanceService) {}

    @Get('dashboard')
    async getFinanceDashboard(@Query('period') period = 'monthly') {
        try {
            const data = await this.financeService.getFinanceDashboard(period);
            return {
                success: true,
                data
            };
        } catch (error) {
            return {
                success: false,
                message: 'Moliya ma\'lumotlarini olishda xatolik',
                error: error.message
            };
        }
    }

    @Get('revenue')
    async getRevenue(@Query('period') period = 'monthly', @Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
        try {
            const revenue = await this.financeService.getRevenue(period, startDate, endDate);
            return {
                success: true,
                data: revenue
            };
        } catch (error) {
            return {
                success: false,
                message: 'Daromad ma\'lumotlarini olishda xatolik',
                error: error.message
            };
        }
    }

    @Get('expenses')
    async getExpenses(@Query('period') period = 'monthly', @Query('category') category?: string) {
        try {
            const expenses = await this.financeService.getExpenses(period, category);
            return {
                success: true,
                data: expenses
            };
        } catch (error) {
            return {
                success: false,
                message: 'Xarajat ma\'lumotlarini olishda xatolik',
                error: error.message
            };
        }
    }

    @Post('expense')
    async addExpense(@Body() expenseData: {
        amount: number;
        category: string;
        description: string;
        date?: string;
    }) {
        try {
            const expense = await this.financeService.addExpense(expenseData);
            return {
                success: true,
                message: 'Xarajat qo\'shildi',
                data: expense
            };
        } catch (error) {
            return {
                success: false,
                message: 'Xarajat qo\'shishda xatolik',
                error: error.message
            };
        }
    }

    @Get('profit')
    async getProfit(@Query('period') period = 'monthly') {
        try {
            const profit = await this.financeService.getProfit(period);
            return {
                success: true,
                data: profit
            };
        } catch (error) {
            return {
                success: false,
                message: 'Foyda ma\'lumotlarini olishda xatolik',
                error: error.message
            };
        }
    }

    @Get('reports/daily')
    async getDailyReport(@Query('date') date?: string) {
        try {
            const report = await this.financeService.getDailyReport(date);
            return {
                success: true,
                data: report
            };
        } catch (error) {
            return {
                success: false,
                message: 'Kunlik hisobot olishda xatolik',
                error: error.message
            };
        }
    }

    @Get('reports/monthly')
    async getMonthlyReport(@Query('year') year?: number, @Query('month') month?: number) {
        try {
            const report = await this.financeService.getMonthlyReport(year, month);
            return {
                success: true,
                data: report
            };
        } catch (error) {
            return {
                success: false,
                message: 'Oylik hisobot olishda xatolik',
                error: error.message
            };
        }
    }

    @Get('charts/revenue-trend')
    async getRevenueTrend(@Query('period') period = '6months') {
        try {
            const trend = await this.financeService.getRevenueTrend(period);
            return {
                success: true,
                data: trend
            };
        } catch (error) {
            return {
                success: false,
                message: 'Daromad tendentsiyasini olishda xatolik',
                error: error.message
            };
        }
    }

    @Get('statistics')
    async getFinanceStatistics() {
        try {
            const stats = await this.financeService.getFinanceStatistics();
            return {
                success: true,
                data: stats
            };
        } catch (error) {
            return {
                success: false,
                message: 'Moliya statistikasini olishda xatolik',
                error: error.message
            };
        }
    }
}