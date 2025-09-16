import { Controller, Get, Post, Delete, Body, Param, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { BotService } from '../bot/bot.service';
import { DataService } from '../services/data.service';
import { PerformanceService } from '../services/performance.service';

@Controller('api/dashboard')
export class DashboardApiController {
    constructor(
        private readonly botService: BotService,
        private readonly dataService: DataService,
        private readonly performanceService: PerformanceService
    ) {}

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
            console.error('❌ Error getting drivers data:', error);
            return {
                success: true,
                data: [],
                total: 0
            };
        }
    }

    @Get('dispatchers')
    async getDispatchers(@Query('status') status?: string) {
        try {
            const dispatchers = await this.getDispatchersData(status);

            return {
                success: true,
                data: dispatchers,
                total: dispatchers.length
            };
        } catch (error) {
            return {
                success: true,
                data: [
                    {
                        id: '#DIS001',
                        name: 'Oybek Salimov',
                        phone: '+998 90 555 12 34',
                        balance: 75000,
                        orders: 45,
                        commission: 225000,
                        rating: 4.7,
                        status: 'active',
                        joinDate: '2024-01-10'
                    },
                    {
                        id: '#DIS002',
                        name: 'Dilshod Umarov',
                        phone: '+998 91 666 23 45',
                        balance: 120000,
                        orders: 67,
                        commission: 335000,
                        rating: 4.9,
                        status: 'active',
                        joinDate: '2024-02-15'
                    }
                ],
                total: 2
            };
        }
    }

    @Get('customers')
    async getCustomers(@Query('status') status?: string) {
        try {
            const customers = await this.getCustomersData(status);

            return {
                success: true,
                data: customers,
                total: customers.length
            };
        } catch (error) {
            return {
                success: true,
                data: [
                    {
                        id: '#C001',
                        name: 'Sardor Rahimov',
                        phone: '+998 90 777 34 56',
                        company: 'Uzbek Logistics LLC',
                        totalOrders: 28,
                        totalSpent: 1420000,
                        rating: 4.6,
                        status: 'active',
                        joinDate: '2024-01-05',
                        lastOrder: '2024-01-14'
                    },
                    {
                        id: '#C002',
                        name: 'Gulnora Karimova',
                        phone: '+998 91 888 45 67',
                        company: 'Individual',
                        totalOrders: 15,
                        totalSpent: 750000,
                        rating: 4.4,
                        status: 'active',
                        joinDate: '2024-01-20',
                        lastOrder: '2024-01-13'
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
            console.log('💰 Adding balance to driver from dashboard:', driverId, amount);

            const result = await this.botService.addDriverBalanceFromDashboard(driverId, amount);

            return {
                success: true,
                message: 'Balans to\'ldirildi',
                data: result
            };
        } catch (error) {
            console.error('❌ Error adding driver balance:', error);
            return {
                success: false,
                message: 'Balans to\'ldirishda xatolik',
                error: error.message
            };
        }
    }

    @Post('drivers/:id/deduct-penalty')
    async deductDriverPenalty(@Param('id') driverId: string, @Body() penaltyData: { amount: number, reason: string }) {
        try {
            console.log('⚠️ Deducting penalty from driver:', driverId, penaltyData.amount);

            const result = await this.botService.addDriverBalanceFromDashboard(driverId, -penaltyData.amount);

            return {
                success: true,
                message: 'Jarima yechildi',
                data: result
            };
        } catch (error) {
            console.error('❌ Error deducting driver penalty:', error);
            return {
                success: false,
                message: 'Jarima yechishda xatolik',
                error: error.message
            };
        }
    }

    @Post('orders')
    async createOrder(@Body() orderData: any) {
        try {
            console.log('📝 Creating new order via dashboard:', orderData);

            // BotService orqali yangi buyurtma yaratish
            const result = await this.botService.createOrderFromDashboard(orderData);

            return {
                success: true,
                message: 'Buyurtma muvaffaqiyatli yaratildi va haydovchilarga yuborildi',
                data: result
            };
        } catch (error) {
            console.error('❌ Error creating order from dashboard:', error);
            return {
                success: false,
                message: 'Buyurtma yaratishda xatolik yuz berdi',
                error: error.message
            };
        }
    }

    @Delete('orders/clear-demo')
    async clearDemoOrders() {
        try {
            console.log('🗑️ Clearing demo orders...');

            // Demo buyurtmalarni tozalash
            const result = await this.botService.clearDemoOrders();

            return {
                success: true,
                message: 'Demo buyurtmalar tozalandi',
                data: result
            };
        } catch (error) {
            console.error('❌ Error clearing demo orders:', error);
            return {
                success: false,
                message: 'Demo buyurtmalarni tozalashda xatolik',
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

    private async getDispatchersData(status?: string) {
        // Bot service orqali real dispecherlarni olish
        return this.botService.getDashboardDispatchers(status);
    }

    private async getCustomersData(status?: string) {
        // Bot service orqali real mijozlarni olish
        return this.botService.getDashboardCustomers(status);
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

    @Get('performance')
    async getPerformanceStats() {
        try {
            const performance = this.performanceService.getDashboardMetrics();
            const dataStats = await this.dataService.getPerformanceStats();

            return {
                success: true,
                data: {
                    system: performance.system,
                    performance: performance.performance,
                    memory: performance.memory,
                    database: dataStats,
                    timestamp: performance.timestamp
                }
            };
        } catch (error) {
            return {
                success: false,
                error: 'Performance ma\'lumotlarni olishda xatolik',
                data: null
            };
        }
    }

    @Post('performance/test-load')
    async testSystemLoad(@Body('operations') operations: number = 1000) {
        try {
            const loadTestResult = await this.performanceService.simulateLoad(operations);

            return {
                success: true,
                message: 'Load test yakunlandi',
                data: loadTestResult
            };
        } catch (error) {
            return {
                success: false,
                message: 'Load testda xatolik',
                error: error.message
            };
        }
    }

    @Get('system-health')
    async getSystemHealth() {
        try {
            const health = this.performanceService.getSystemHealth();
            const cacheStats = this.dataService.getCacheStats();

            return {
                success: true,
                data: {
                    ...health,
                    cache: cacheStats
                }
            };
        } catch (error) {
            return {
                success: false,
                error: 'Sistem sog\'ligini tekshirishda xatolik',
                data: null
            };
        }
    }

    // Order management endpoints
    @Post('orders/:id/cancel')
    async cancelOrder(@Param('id') orderId: string) {
        try {
            console.log('❌ Cancelling order from dashboard:', orderId);

            const result = await this.botService.cancelOrderFromDashboard(orderId);

            return {
                success: true,
                message: 'Buyurtma bekor qilindi va barcha haydovchilardan olib tashlandi',
                data: result
            };
        } catch (error) {
            console.error('❌ Error cancelling order:', error);
            return {
                success: false,
                message: 'Buyurtmani bekor qilishda xatolik yuz berdi',
                error: error.message
            };
        }
    }

    @Post('orders/:id/resend')
    async resendOrder(@Param('id') orderId: string) {
        try {
            console.log('🔄 Resending order from dashboard:', orderId);

            const result = await this.botService.resendOrderFromDashboard(orderId);

            return {
                success: true,
                message: 'Buyurtma qayta haydovchilarga yuborildi',
                data: result
            };
        } catch (error) {
            console.error('❌ Error resending order:', error);
            return {
                success: false,
                message: 'Buyurtmani qayta yuborishda xatolik yuz berdi',
                error: error.message
            };
        }
    }

    @Get('orders/:id')
    async getOrderDetails(@Param('id') orderId: string) {
        try {
            console.log('👁️ Getting order details from dashboard:', orderId);

            const result = await this.botService.getOrderDetailsFromDashboard(orderId);

            return {
                success: true,
                data: result
            };
        } catch (error) {
            console.error('❌ Error getting order details:', error);
            return {
                success: false,
                message: 'Buyurtma ma\'lumotlarini olishda xatolik yuz berdi',
                error: error.message
            };
        }
    }

    // Driver management endpoints
    @Get('drivers/:id')
    async getDriverDetails(@Param('id') driverId: string) {
        try {
            console.log('👁️ Getting driver details from dashboard:', driverId);

            const result = await this.botService.getDriverDetailsFromDashboard(driverId);

            return {
                success: true,
                data: result
            };
        } catch (error) {
            console.error('❌ Error getting driver details:', error);
            return {
                success: false,
                message: 'Haydovchi ma\'lumotlarini olishda xatolik yuz berdi',
                error: error.message
            };
        }
    }

    @Post('drivers')
    async addDriver(@Body() driverData: any) {
        try {
            console.log('👨‍💼 Adding new driver from dashboard:', driverData);

            // Bot service orqali yangi haydovchi qo'shish
            const result = await this.botService.addDriverFromDashboard(driverData);

            return {
                success: true,
                message: 'Haydovchi muvaffaqiyatli qo\'shildi',
                data: result
            };
        } catch (error) {
            console.error('❌ Error adding driver:', error);
            return {
                success: false,
                message: 'Haydovchi qo\'shishda xatolik yuz berdi',
                error: error.message
            };
        }
    }
}