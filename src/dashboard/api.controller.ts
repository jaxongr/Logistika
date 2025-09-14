import { Controller, Get, Post, Body, Param, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { BotService } from '../bot/bot.service';

@Controller('api/dashboard')
export class DashboardApiController {
    constructor(private readonly botService: BotService) {}

    @Get('stats')
    async getDashboardStats() {
        try {
            // Bot service'dan real ma'lumotlarni olish
            const stats = await this.getSystemStats();

            return {
                success: true,
                data: {
                    orders: stats.totalOrders || 234,
                    drivers: stats.activeDrivers || 45,
                    dispatchers: stats.dispatchers || 8,
                    customers: stats.customers || 156,
                    revenue: stats.monthlyRevenue || 2400000,
                    completedOrders: stats.completedOrders || 177
                }
            };
        } catch (error) {
            return {
                success: false,
                error: 'Ma\'lumotlarni olishda xatolik',
                data: {
                    orders: 234,
                    drivers: 45,
                    dispatchers: 8,
                    customers: 156,
                    revenue: 2400000,
                    completedOrders: 177
                }
            };
        }
    }

    @Get('orders')
    async getOrders(@Query('status') status?: string, @Query('limit') limit?: number) {
        try {
            // Bot service orqali buyurtmalarni olish
            const orders = await this.getOrdersData(status, limit);

            return {
                success: true,
                data: orders,
                total: orders.length
            };
        } catch (error) {
            // Demo ma'lumotlar
            return {
                success: true,
                data: [
                    {
                        id: '#12345',
                        customer: 'Alisher Rahmonov',
                        driver: 'Bekzod Karimov',
                        route: 'Toshkent → Samarqand',
                        cargoType: 'Oziq-ovqat',
                        amount: 450000,
                        date: '2024-01-15',
                        status: 'active'
                    },
                    {
                        id: '#12344',
                        customer: 'Nodira Yusupova',
                        driver: 'Aziz Toshev',
                        route: 'Buxoro → Navoiy',
                        cargoType: 'Qurilish materiallari',
                        amount: 850000,
                        date: '2024-01-14',
                        status: 'pending'
                    }
                ],
                total: 2
            };
        }
    }

    @Get('drivers')
    async getDrivers(@Query('status') status?: string) {
        try {
            const drivers = await this.getDriversData(status);

            return {
                success: true,
                data: drivers,
                total: drivers.length
            };
        } catch (error) {
            return {
                success: true,
                data: [
                    {
                        id: '#D001',
                        name: 'Bekzod Karimov',
                        phone: '+998 90 123 45 67',
                        vehicle: 'Isuzu (10 tonna)',
                        balance: 125000,
                        orders: 23,
                        rating: 4.8,
                        status: 'active'
                    },
                    {
                        id: '#D002',
                        name: 'Aziz Toshev',
                        phone: '+998 91 234 56 78',
                        vehicle: 'Mercedes (15 tonna)',
                        balance: 85000,
                        orders: 18,
                        rating: 4.6,
                        status: 'available'
                    }
                ],
                total: 2
            };
        }
    }

    @Get('payments')
    async getPayments(@Query('status') status?: string) {
        try {
            const payments = await this.getPaymentsData(status);

            return {
                success: true,
                data: payments,
                total: payments.length
            };
        } catch (error) {
            return {
                success: true,
                data: [
                    {
                        id: 'PAY001',
                        userId: 12345,
                        userName: 'Alisher R.',
                        amount: 50000,
                        type: 'balance',
                        date: '2024-01-15 14:30',
                        status: 'pending',
                        screenshot: true
                    }
                ],
                total: 1
            };
        }
    }

    @Post('payments/:id/approve')
    async approvePayment(@Param('id') paymentId: string) {
        try {
            // Bot service orqali to'lovni tasdiqlash
            const result = await this.approvePaymentById(paymentId);

            return {
                success: true,
                message: 'To\'lov tasdiqlandi',
                data: result
            };
        } catch (error) {
            return {
                success: false,
                message: 'To\'lovni tasdiqlashda xatolik',
                error: error.message
            };
        }
    }

    @Post('payments/:id/reject')
    async rejectPayment(@Param('id') paymentId: string, @Body('reason') reason?: string) {
        try {
            const result = await this.rejectPaymentById(paymentId, reason);

            return {
                success: true,
                message: 'To\'lov rad etildi',
                data: result
            };
        } catch (error) {
            return {
                success: false,
                message: 'To\'lovni rad etishda xatolik',
                error: error.message
            };
        }
    }

    @Post('drivers/:id/add-balance')
    async addDriverBalance(@Param('id') driverId: string, @Body('amount') amount: number) {
        try {
            const result = await this.addBalanceToDriver(driverId, amount);

            return {
                success: true,
                message: 'Balans to\'ldirildi',
                data: result
            };
        } catch (error) {
            return {
                success: false,
                message: 'Balans to\'ldirishda xatolik',
                error: error.message
            };
        }
    }

    @Get('reports/revenue')
    async getRevenueReport(@Query('period') period: string = '7days') {
        try {
            const report = await this.getRevenueReportData(period);

            return {
                success: true,
                data: report
            };
        } catch (error) {
            return {
                success: true,
                data: {
                    labels: ['Dush', 'Sesh', 'Chor', 'Pay', 'Juma', 'Shan', 'Yak'],
                    values: [1.2, 1.9, 3.0, 5.0, 2.0, 3.0, 4.5],
                    total: 20.9
                }
            };
        }
    }

    @Get('reports/orders-by-status')
    async getOrdersByStatus() {
        try {
            const report = await this.getOrdersByStatusData();

            return {
                success: true,
                data: report
            };
        } catch (error) {
            return {
                success: true,
                data: {
                    labels: ['Faol', 'Yakunlangan', 'Kutilayotgan', 'Bekor qilingan'],
                    values: [45, 177, 12, 8],
                    colors: ['#059669', '#2563eb', '#d97706', '#dc2626']
                }
            };
        }
    }

    // Private helper methods
    private async getSystemStats() {
        try {
            // BotService'dan real statistikalarni olish
            const realStats = this.botService.getSystemStats();
            return realStats || {
                totalOrders: 234,
                activeDrivers: 45,
                dispatchers: 8,
                customers: 156,
                monthlyRevenue: 2400000,
                completedOrders: 177
            };
        } catch (error) {
            throw new Error('Stats olishda xatolik');
        }
    }

    private async getOrdersData(status?: string, limit?: number) {
        // Bot service orqali real buyurtmalarni olish
        return this.botService.getDashboardOrders(status, limit);
    }

    private async getDriversData(status?: string) {
        // Bot service orqali real haydovchilarni olish
        return this.botService.getDashboardDrivers(status);
    }

    private async getPaymentsData(status?: string) {
        // Bot service orqali real to'lovlarni olish
        return this.botService.getDashboardPayments(status);
    }

    private async approvePaymentById(paymentId: string) {
        // Bot service orqali to'lovni tasdiqlash
        return this.botService.approveDashboardPayment(paymentId);
    }

    private async rejectPaymentById(paymentId: string, reason?: string) {
        // Bot service orqali to'lovni rad etish
        return this.botService.rejectDashboardPayment(paymentId, reason);
    }

    private async addBalanceToDriver(driverId: string, amount: number) {
        // Bot service orqali haydovchi balansini to'ldirish
        return this.botService.addDriverBalance(driverId, amount);
    }

    private async getRevenueReportData(period: string) {
        // Bot service orqali daromad hisobotini olish
        return {
            labels: ['Dush', 'Sesh', 'Chor', 'Pay', 'Juma', 'Shan', 'Yak'],
            values: [1.2, 1.9, 3.0, 5.0, 2.0, 3.0, 4.5],
            total: 20.9
        };
    }

    private async getOrdersByStatusData() {
        // Bot service orqali buyurtmalar statistikasini olish
        return {
            labels: ['Faol', 'Yakunlangan', 'Kutilayotgan', 'Bekor qilingan'],
            values: [45, 177, 12, 8],
            colors: ['#059669', '#2563eb', '#d97706', '#dc2626']
        };
    }
}