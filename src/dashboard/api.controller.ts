import { Controller, Get, Post, Delete, Body, Param, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { BotService } from '../bot/bot.service';
import { DataService } from '../services/data.service';
import { PerformanceService } from '../services/performance.service';
import * as fs from 'fs';
import * as path from 'path';

let uzbekistanLocations = { regions: [] };
try {
    const locationsPath = path.join(process.cwd(), 'src', 'data', 'uzbekistan-locations.json');
    if (fs.existsSync(locationsPath)) {
        uzbekistanLocations = JSON.parse(fs.readFileSync(locationsPath, 'utf8'));
    } else {
        console.log('⚠️ uzbekistan-locations.json not found at:', locationsPath);
    }
} catch (error) {
    console.log('⚠️ Error loading uzbekistan-locations.json:', error.message);
}

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
            // Tarix faylidan statistikalarni olish
            const historyStats = await this.getStatsFromHistory();
            const liveStats = await this.getSystemStats();

            return {
                success: true,
                data: {
                    orders: historyStats.totalOrders || 0,
                    drivers: liveStats.activeDrivers || 45,
                    dispatchers: liveStats.dispatchers || 8,
                    customers: historyStats.totalCustomers || 0,
                    revenue: historyStats.totalRevenue || 0,
                    completedOrders: historyStats.completedOrders || 0
                }
            };
        } catch (error) {
            return {
                success: false,
                error: 'Ma\'lumotlarni olishda xatolik',
                data: {
                    orders: 0,
                    drivers: 45,
                    dispatchers: 8,
                    customers: 0,
                    revenue: 0,
                    completedOrders: 0
                }
            };
        }
    }

    @Get('orders')
    async getOrders(@Query('status') status?: string, @Query('limit') limit?: number) {
        try {
            // History va active buyurtmalarni birlashtirish
            const orders = await this.getOrdersData(status, limit);

            return {
                success: true,
                data: orders,
                total: orders.length
            };
        } catch (error) {
            console.error('❌ Error getting orders:', error);
            return {
                success: true,
                data: [],
                total: 0
            };
        }
    }

    @Get('drivers')
    async getDrivers(@Query('status') status?: string) {
        try {
            console.log('📊 Getting drivers data with status:', status);
            const drivers = await this.getDriversData(status);
            console.log('📈 Drivers data fetched:', drivers.length, 'drivers found');

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

    @Get('test-buttons')
    async testButtons() {
        return {
            success: true,
            message: 'Button test endpoint working',
            data: {
                timestamp: new Date().toISOString(),
                available_buttons: ['balance-btn', 'penalty-btn']
            }
        };
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

    // MIJOZNI TELEFON RAQAMI BO'YICHA QIDIRISH
    @Get('customers/search')
    async searchCustomerByPhone(@Query('phone') phone: string) {
        try {
            if (!phone) {
                return {
                    success: false,
                    error: 'Telefon raqami kiritilmagan'
                };
            }

            // 1. Avval mijozlar bazasidan qidirish
            const customersFilePath = path.join(process.cwd(), 'customers-database.json');
            let savedCustomer = null;

            if (fs.existsSync(customersFilePath)) {
                try {
                    const customersData = fs.readFileSync(customersFilePath, 'utf-8');
                    const customersDb = JSON.parse(customersData);
                    let customers = [];
                    // Fayl strukturasini tekshirish
                    if (Array.isArray(customersDb)) {
                        customers = customersDb;
                    } else if (customersDb && Array.isArray(customersDb.customers)) {
                        customers = customersDb.customers;
                    }
                    savedCustomer = customers.find(customer => customer.phone === phone);
                } catch (error) {
                    console.log('Error reading customers database:', error);
                }
            }

            // 2. Bajarilgan buyurtmalar tarixidan ham qidirish
            const completedOrders = await this.getCustomersOrdersHistory();
            const customerOrders = completedOrders.filter(order =>
                order.phone === phone || order.customer === phone ||
                (order.customerPhone && order.customerPhone === phone)
            );

            if (savedCustomer || customerOrders.length > 0) {
                // Mavjud mijoz - statistikalarni hisoblash
                const totalSpent = customerOrders
                    .reduce((sum, order) => sum + (order.price || order.amount || 0), 0);

                const completedOrdersCount = customerOrders.length; // Hammasi bajarilgan

                // Mijoz ismini topish (birinchi navbatda saqlangan mijozdan, keyin buyurtmalardan)
                let customerName = '';
                if (savedCustomer) {
                    customerName = savedCustomer.name;
                } else if (customerOrders.length > 0) {
                    const latestOrder = customerOrders
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                    customerName = latestOrder.customerName || latestOrder.customer || '';
                }

                const customer = {
                    id: savedCustomer?.id || `CUST_${Date.now()}_${phone.replace(/[^0-9]/g, '')}`,
                    name: customerName,
                    phone: phone,
                    orderCount: customerOrders.length,
                    totalSpent: totalSpent,
                    completedOrders: completedOrdersCount,
                    lastOrderDate: customerOrders.length > 0 ? customerOrders[0].date : savedCustomer?.joinDate,
                    status: 'active'
                };

                return {
                    success: true,
                    found: true,
                    customer: customer
                };
            } else {
                // Yangi mijoz
                return {
                    success: true,
                    found: false,
                    message: 'Yangi mijoz'
                };
            }
        } catch (error) {
            console.error('Customer search error:', error);
            return {
                success: false,
                error: 'Mijozni qidirishda xatolik'
            };
        }
    }

    // MIJOZ TARIXINI OLISH (BAJARILGAN VA BEKOR QILINGAN)
    @Get('customers/:customerId/history')
    async getCustomerHistory(@Param('customerId') customerId: string) {
        try {
            // Customer ID dan telefon raqamini ajratish (C_ yoki CUST_ prefikslarini olib tashlash)
            let phoneNumber = customerId;
            if (phoneNumber.startsWith('C_')) {
                phoneNumber = phoneNumber.replace('C_', '');
            } else if (phoneNumber.startsWith('CUST_')) {
                phoneNumber = phoneNumber.replace('CUST_', '').split('_')[0];
            }
            phoneNumber = phoneNumber.replace(/[^0-9]/g, '');

            // 1. Bajarilgan buyurtmalar tarixidan olish
            const completedOrders = await this.getCustomersOrdersHistory();
            const customerCompletedOrders = completedOrders.filter(order => {
                const orderPhone = (order.phone || order.customerPhone || '').replace(/[^0-9]/g, '');
                return orderPhone === phoneNumber;
            });

            // 2. Bekor qilingan buyurtmalarni user-data.json dan olish
            const userDataPath = path.join(process.cwd(), 'user-data.json');
            let cancelledOrders = [];

            if (fs.existsSync(userDataPath)) {
                try {
                    const userData = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
                    if (userData.cargoOffers) {
                        const allOrders = Object.values(userData.cargoOffers);
                        cancelledOrders = allOrders.filter((order: any) => {
                            const orderPhone = (order.phone || order.customerPhone || '').replace(/[^0-9]/g, '');
                            return orderPhone === phoneNumber && order.status === 'cancelled';
                        });
                    }
                } catch (error) {
                    console.log('Error reading cancelled orders:', error);
                }
            }

            // 3. Barcha buyurtmalarni birlashtirish
            const allCustomerOrders = [
                ...customerCompletedOrders.map(order => ({ ...order, status: 'completed' })),
                ...cancelledOrders.map((order: any) => ({
                    ...order,
                    status: 'cancelled',
                    date: order.cancelledAt || order.date || order.createdAt
                }))
            ];

            if (allCustomerOrders.length === 0) {
                return {
                    success: true,
                    orders: [],
                    stats: {
                        totalOrders: 0,
                        completedOrders: 0,
                        cancelledOrders: 0,
                        totalSpent: 0
                    }
                };
            }

            // 4. Buyurtmalarni sanalar bo'yicha tartiblash
            const sortedOrders = allCustomerOrders
                .sort((a, b) => {
                    const dateA = new Date(a.completedAt || a.cancelledAt || a.date || a.createdAt);
                    const dateB = new Date(b.completedAt || b.cancelledAt || b.date || b.createdAt);
                    return dateB.getTime() - dateA.getTime();
                })
                .map(order => ({
                    id: order.id,
                    date: order.completedAt || order.cancelledAt || order.date || order.createdAt,
                    fromCity: order.fromCity || 'N/A',
                    toCity: order.toCity || 'N/A',
                    route: `${order.fromCity || 'N/A'} → ${order.toCity || 'N/A'}`,
                    cargoType: order.cargoType || 'Noma\'lum',
                    price: order.price || order.amount || 0,
                    amount: order.price || order.amount || 0,
                    status: order.status,
                    driverName: order.driverName || 'Noma\'lum',
                    createdAt: order.createdAt || order.date
                }));

            // 5. Statistikalar
            const completedCount = sortedOrders.filter(order => order.status === 'completed').length;
            const cancelledCount = sortedOrders.filter(order => order.status === 'cancelled').length;
            const totalSpent = sortedOrders
                .filter(order => order.status === 'completed')
                .reduce((sum, order) => sum + (order.price || 0), 0);

            return {
                success: true,
                orders: sortedOrders,
                stats: {
                    totalOrders: allCustomerOrders.length,
                    completedOrders: completedCount,
                    cancelledOrders: cancelledCount,
                    totalSpent: totalSpent
                }
            };
        } catch (error) {
            console.error('Customer history error:', error);
            return {
                success: false,
                error: 'Mijoz tarixini olishda xatolik'
            };
        }
    }

    @Get('customers/orders-history')
    async getCustomersOrdersHistory() {
        try {
            const customerHistoryPath = path.join(process.cwd(), 'customer-orders-history.json');

            if (!fs.existsSync(customerHistoryPath)) {
                return [];
            }

            const historyData = JSON.parse(fs.readFileSync(customerHistoryPath, 'utf8'));
            return historyData || [];
        } catch (error) {
            console.error('Error loading customers orders history:', error);
            return [];
        }
    }

    @Get('drivers/orders-history')
    async getDriversOrdersHistory() {
        try {
            const driverHistoryPath = path.join(process.cwd(), 'driver-orders-history.json');

            if (!fs.existsSync(driverHistoryPath)) {
                return [];
            }

            const historyData = JSON.parse(fs.readFileSync(driverHistoryPath, 'utf8'));
            return historyData || [];
        } catch (error) {
            console.error('Error loading drivers orders history:', error);
            return [];
        }
    }

    @Get('orders-history')
    async getDispatcherOrdersHistory() {
        try {
            const dispatcherHistoryPath = path.join(process.cwd(), 'dispatcher-orders-history.json');

            if (!fs.existsSync(dispatcherHistoryPath)) {
                return [];
            }

            const historyData = JSON.parse(fs.readFileSync(dispatcherHistoryPath, 'utf8'));
            return historyData || [];
        } catch (error) {
            console.error('Error loading dispatcher orders history:', error);
            return [];
        }
    }

    // Dashboard'dan mijoz saqlash uchun maxsus funksiya
    private async saveCustomerFromDashboard(customerData: any) {
        try {
            const customersPath = path.join(process.cwd(), 'customers-database.json');
            let customers = [];

            // Mavjud mijozlar ro'yxatini yuklash
            if (fs.existsSync(customersPath)) {
                const fileData = JSON.parse(fs.readFileSync(customersPath, 'utf8'));
                // Fayl struktura tekshirish
                if (Array.isArray(fileData)) {
                    customers = fileData;
                } else if (fileData && Array.isArray(fileData.customers)) {
                    customers = fileData.customers;
                } else {
                    customers = [];
                }
            }

            // Mijoz allaqachon mavjudligini tekshirish
            const existingCustomer = customers.find(c => c.phone === customerData.phone);
            if (existingCustomer) {
                console.log('📝 Customer already exists:', customerData.phone);
                return existingCustomer;
            }

            // Yangi mijoz yaratish
            const newCustomer = {
                id: `CUST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                phone: customerData.phone,
                name: customerData.name,
                joinDate: customerData.joinDate || new Date().toISOString(),
                status: customerData.status || 'active',
                source: customerData.source || 'Dashboard',
                totalOrders: 0,
                totalSpent: 0,
                createdAt: new Date().toISOString()
            };

            customers.push(newCustomer);

            // Faylga saqlash - array formatida
            fs.writeFileSync(customersPath, JSON.stringify(customers, null, 2));
            console.log('✅ New customer saved:', newCustomer.id, newCustomer.name);

            return newCustomer;
        } catch (error) {
            console.error('Error saving customer from dashboard:', error);
            return null;
        }
    }

    // MIJOZLARNI TAHRIRLASH TAQIQLANDI
    @Post('customers')
    async createCustomer(@Body() customerData: any) {
        return {
            success: false,
            error: 'Mijozlar ma\'lumotlarini qo\'lda o\'zgartirish taqiqlangan',
            message: 'Mijozlar buyurtma yaratish vaqtida avtomatik qo\'shiladi'
        };
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

            const result = await this.botService.addDriverBalanceFromDashboard(driverId, amount, undefined);
            console.log('✅ Balance API result:', result);

            return {
                success: true,
                message: 'Balans to\'ldirildi',
                data: result
            };
        } catch (error) {
            console.error('❌ Error in addDriverBalance API:', error);
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

            const result = await this.botService.addDriverBalanceFromDashboard(driverId, -penaltyData.amount, penaltyData.reason);
            console.log('✅ Penalty API result:', result);

            return {
                success: true,
                message: 'Jarima yechildi',
                data: result
            };
        } catch (error) {
            console.error('❌ Error in deductDriverPenalty API:', error);
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
            console.log('📝 [API] Received order creation request:', JSON.stringify(orderData, null, 2));

            // Validate required fields
            if (!orderData.customerPhone || !orderData.fromCity || !orderData.toCity) {
                console.error('❌ [API] Missing required fields:', {
                    customerPhone: !!orderData.customerPhone,
                    fromCity: !!orderData.fromCity,
                    toCity: !!orderData.toCity
                });
                return {
                    success: false,
                    message: 'Majburiy maydonlar to\'ldirilmagan (mijoz telefoni, qayerdan, qayerga)',
                    error: 'Missing required fields'
                };
            }

            // Dashboard'dan buyurtma yaratilganda mijozni avtomatik saqlash
            if (orderData.customerName && orderData.customerPhone) {
                await this.saveCustomerFromDashboard({
                    phone: orderData.customerPhone,
                    name: orderData.customerName,
                    joinDate: new Date().toISOString(),
                    status: 'active',
                    source: 'Dashboard'
                });
            }

            console.log('✅ [API] Validation passed, calling BotService...');

            // BotService orqali yangi buyurtma yaratish
            const result = await this.botService.createOrderFromDashboard(orderData);
            console.log('✅ [API] BotService result:', result);

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
        return {
            success: false,
            error: 'Buyurtmalar tarixini o\'zgartirish taqiqlangan',
            message: 'Bu ma\'lumotlar himoyalangan'
        };
    }

    @Delete('drivers/clear-demo')
    async clearDemoDrivers() {
        try {
            console.log('🗑️ Clearing demo drivers...');

            // Demo haydovchilarni tozalash
            const result = await this.botService.clearDemoData();

            return {
                success: true,
                message: 'Demo haydovchilar tozalandi',
                data: result
            };
        } catch (error) {
            console.error('❌ Error clearing demo drivers:', error);
            return {
                success: false,
                message: 'Demo haydovchilarni tozalashda xatolik',
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

    @Get('orders/history')
    async getOrdersHistory(@Query('page') page: number = 1, @Query('limit') limit: number = 50) {
        try {
            const historyFilePath = path.join(process.cwd(), 'completed-orders-history.json');

            if (!fs.existsSync(historyFilePath)) {
                return {
                    success: true,
                    data: [],
                    total: 0,
                    page: page,
                    limit: limit
                };
            }

            const historyData = fs.readFileSync(historyFilePath, 'utf-8');
            const allHistory = JSON.parse(historyData);

            // Pagination
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const paginatedHistory = allHistory.slice(startIndex, endIndex);

            return {
                success: true,
                data: paginatedHistory,
                total: allHistory.length,
                page: page,
                limit: limit,
                totalPages: Math.ceil(allHistory.length / limit)
            };

        } catch (error) {
            console.error('❌ Error loading orders history:', error);
            return {
                success: false,
                message: 'Buyurtmalar tarixini yuklashda xatolik',
                error: error.message,
                data: []
            };
        }
    }

    @Get('drivers/:driverId/orders')
    async getDriverOrders(@Param('driverId') driverId: string) {
        try {
            const driverHistoryPath = path.join(process.cwd(), 'driver-orders-history.json');

            if (!fs.existsSync(driverHistoryPath)) {
                return {
                    success: true,
                    data: [],
                    stats: {
                        totalOrders: 0,
                        totalRevenue: 0,
                        totalCommission: 0
                    }
                };
            }

            const historyData = fs.readFileSync(driverHistoryPath, 'utf-8');
            const allHistory = JSON.parse(historyData);

            // Parse driver ID (remove prefix if exists)
            const cleanDriverId = driverId.replace(/^#?D/, '');

            // Filter orders by driver
            const driverOrders = allHistory.filter(order => {
                const orderDriverId = String(order.driverId).replace(/^#?D/, '');
                return orderDriverId === cleanDriverId;
            });

            // Sort by completion date (newest first)
            driverOrders.sort((a, b) => {
                const dateA = new Date(a.completedAt || a.completedDate || a.savedAt);
                const dateB = new Date(b.completedAt || b.completedDate || b.savedAt);
                return dateB.getTime() - dateA.getTime();
            });

            // Calculate commission (10% of order price)
            const processedOrders = driverOrders.map(order => {
                const commission = Math.round((order.price || 0) * 0.1); // 10% komisya
                return {
                    id: order.cargoId || order.id,
                    customerName: order.customerName || 'Noma\'lum mijoz',
                    route: `${order.fromCity || 'N/A'} → ${order.toCity || 'N/A'}`,
                    cargoType: order.cargoType || 'Noma\'lum',
                    price: order.price || 0,
                    commission: commission,
                    completedDate: order.completedAt || order.completedDate,
                    rating: order.rating || null,
                    description: order.description || ''
                };
            });

            // Calculate statistics
            const totalRevenue = driverOrders.reduce((sum, order) => sum + (order.price || 0), 0);
            const totalCommission = Math.round(totalRevenue * 0.1); // 10% jami komisya

            return {
                success: true,
                data: processedOrders,
                stats: {
                    totalOrders: driverOrders.length,
                    totalRevenue: totalRevenue,
                    totalCommission: totalCommission
                }
            };

        } catch (error) {
            console.error('❌ Error loading driver orders:', error);
            return {
                success: false,
                message: 'Haydovchi buyurtmalarini yuklashda xatolik',
                error: error.message,
                data: [],
                stats: {
                    totalOrders: 0,
                    totalRevenue: 0,
                    totalCommission: 0
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

    // History faylidan statistikalarni olish
    private async getStatsFromHistory(): Promise<any> {
        try {
            const dispatcherHistoryPath = path.join(process.cwd(), 'dispatcher-orders-history.json');

            if (!fs.existsSync(dispatcherHistoryPath)) {
                return {
                    totalOrders: 0,
                    completedOrders: 0,
                    totalRevenue: 0,
                    totalCustomers: 0
                };
            }

            const historyData = fs.readFileSync(dispatcherHistoryPath, 'utf-8');
            const allHistory = JSON.parse(historyData);

            const totalOrders = allHistory.length;
            const completedOrders = allHistory.filter(order => order.status === 'completed').length;
            const totalRevenue = allHistory.reduce((sum, order) => sum + (order.price || 0), 0);
            const uniqueCustomers = new Set(allHistory.map(order => order.customerId)).size;

            return {
                totalOrders,
                completedOrders,
                totalRevenue,
                totalCustomers: uniqueCustomers
            };

        } catch (error) {
            console.error('❌ Error reading history stats:', error);
            return {
                totalOrders: 0,
                completedOrders: 0,
                totalRevenue: 0,
                totalCustomers: 0
            };
        }
    }

    // History faylidan buyurtmalarni olish (eng oxirgisi tepada)
    private async getOrdersFromHistory(status?: string, limit: number = 20): Promise<any[]> {
        try {
            const historyFilePath = path.join(process.cwd(), 'completed-orders-history.json');

            if (!fs.existsSync(historyFilePath)) {
                return [];
            }

            const historyData = fs.readFileSync(historyFilePath, 'utf-8');
            let allHistory = JSON.parse(historyData);

            // Oxirgi buyurtmalar tepada bo'lishi uchun tartib
            allHistory.sort((a, b) => {
                const dateA = new Date(a.completedAt || a.completedDate || a.savedAt);
                const dateB = new Date(b.completedAt || b.completedDate || b.savedAt);
                return dateB.getTime() - dateA.getTime(); // Newest first
            });

            // Status filter
            if (status) {
                allHistory = allHistory.filter(order => order.status === status);
            }

            // Limit
            const limitedHistory = allHistory.slice(0, limit);

            // Dashboard formatiga o'tkazish
            return limitedHistory.map(order => ({
                id: order.cargoId || order.id,
                customer: order.customerName || 'Noma\'lum mijoz',
                driver: order.driverName || 'Noma\'lum haydovchi',
                route: `${order.fromCity || 'N/A'} → ${order.toCity || 'N/A'}`,
                cargoType: order.cargoType || 'Noma\'lum',
                amount: order.price || 0,
                date: this.formatDate(order.completedAt || order.completedDate || order.orderDate),
                status: 'completed',
                completedAt: order.completedAt,
                rating: order.rating || null
            }));

        } catch (error) {
            console.error('❌ Error reading orders from history:', error);
            return [];
        }
    }

    // Sana formatini yaratish
    private formatDate(dateString: string): string {
        if (!dateString) return new Date().toISOString().split('T')[0];

        try {
            const date = new Date(dateString);
            return date.toISOString().split('T')[0];
        } catch {
            return new Date().toISOString().split('T')[0];
        }
    }

    private async getOrdersData(status?: string, limit?: number) {
        try {
            // 1. History faylidan tugallangan buyurtmalarni olish
            const historyOrders = await this.getOrdersFromHistory(status, limit);
            console.log(`📊 [API] History orders: ${historyOrders.length}`);

            // 2. Faol buyurtmalarni botService orqali olish
            const activeOrders = await this.botService.getDashboardOrders();
            console.log(`📊 [API] Active orders from botService: ${activeOrders.length}`);
            console.log(`🔍 [API DEBUG] First active order:`, activeOrders[0] ? JSON.stringify(activeOrders[0], null, 2) : 'NONE');

            // 3. Barcha buyurtmalarni birlashtirish
            const allOrders = [...historyOrders, ...activeOrders];
            console.log(`📊 [API] Combined orders: ${allOrders.length}`);

            // 4. Status bo'yicha filter qilish
            let filteredOrders = allOrders;
            if (status) {
                filteredOrders = allOrders.filter(order => order.status === status);
                console.log(`📊 [API] Filtered by status '${status}': ${allOrders.length} -> ${filteredOrders.length}`);
            }

            // 5. Takrorlanuvchi buyurtmalarni olib tashlash (active buyurtmalar ustun bo'lishi kerak)
            const uniqueOrdersMap = new Map();
            filteredOrders.forEach(order => {
                const existingOrder = uniqueOrdersMap.get(order.id);
                if (!existingOrder) {
                    // Yangi buyurtma qo'shish
                    uniqueOrdersMap.set(order.id, order);
                } else if (order.status === 'active' && existingOrder.status !== 'active') {
                    // Active status ustunlik qiladi (completed'ni bostirib o'tkazadi)
                    uniqueOrdersMap.set(order.id, order);
                }
                // Agar ikkala order ham active yoki ikkala order ham completed bo'lsa, birinchisini saqlash
            });
            const uniqueOrders = Array.from(uniqueOrdersMap.values());

            // 6. Vaqt bo'yicha tartiblash (yangi birinchi)
            uniqueOrders.sort((a, b) => {
                const dateA = new Date(a.createdAt || a.date || 0);
                const dateB = new Date(b.createdAt || b.date || 0);
                return dateB.getTime() - dateA.getTime();
            });

            const finalOrders = limit ? uniqueOrders.slice(0, limit) : uniqueOrders;
            console.log(`📊 [API] Final orders returned: ${finalOrders.length}`);
            return finalOrders;

        } catch (error) {
            console.error('Error in getOrdersData:', error);
            // Fallback to history only
            return this.getOrdersFromHistory(status, limit);
        }
    }

    private async getDriversData(status?: string) {
        try {
            // Bot service orqali real haydovchilarni olish
            const drivers = await this.botService.getDashboardDrivers(status);

            // Har bir haydovchi uchun komisya summasini hisoblash
            const historyFilePath = path.join(process.cwd(), 'completed-orders-history.json');

            if (fs.existsSync(historyFilePath)) {
                const historyData = fs.readFileSync(historyFilePath, 'utf-8');
                const allHistory = JSON.parse(historyData);

                // Har bir haydovchi uchun komisya hisoblash
                drivers.forEach((driver: any) => {
                    const cleanDriverId = String(driver.realId || driver.id).replace(/^#?D/, '');

                    const driverOrders = allHistory.filter(order => {
                        const orderDriverId = String(order.driverId).replace(/^#?D/, '');
                        return orderDriverId === cleanDriverId;
                    });

                    const totalRevenue = driverOrders.reduce((sum, order) => sum + (order.price || 0), 0);
                    driver.totalCommission = Math.round(totalRevenue * 0.1); // 10% komisya
                });
            } else {
                // Agar tarix fayli bo'lmasa, barcha haydovchilar uchun 0
                drivers.forEach((driver: any) => {
                    driver.totalCommission = 0;
                });
            }

            return drivers;

        } catch (error) {
            console.error('❌ Error in getDriversData:', error);
            return this.botService.getDashboardDrivers(status);
        }
    }

    private async getDispatchersData(status?: string) {
        // Bot service orqali real dispecherlarni olish
        return this.botService.getDashboardDispatchers(status);
    }

    private async getCustomersData(status?: string) {
        try {
            // Saqlangan mijozlar faylini o'qish
            const customersFilePath = path.join(process.cwd(), 'customers-database.json');
            let savedCustomers = [];

            if (fs.existsSync(customersFilePath)) {
                try {
                    const customersData = fs.readFileSync(customersFilePath, 'utf-8');
                    const customersDb = JSON.parse(customersData);
                    // Fayl strukturasini tekshirish
                    if (Array.isArray(customersDb)) {
                        savedCustomers = customersDb;
                    } else if (customersDb && Array.isArray(customersDb.customers)) {
                        savedCustomers = customersDb.customers;
                    } else {
                        savedCustomers = [];
                    }
                } catch (error) {
                    console.log('Error reading customers database:', error);
                }
            }

            // Faqat bajarilgan buyurtmalar tarixidan mijozlarni olish
            const completedOrders = await this.getCustomersOrdersHistory();
            const orderCustomers = new Map();

            completedOrders.forEach(order => {
                const phone = order.customerPhone || order.phone;
                if (phone && !savedCustomers.find(c => c.phone === phone)) {
                    if (!orderCustomers.has(phone)) {
                        orderCustomers.set(phone, {
                            id: `C_${phone.replace(/[^0-9]/g, '')}`,
                            phone: phone,
                            name: order.customerName || order.customer || 'Noma\'lum',
                            joinDate: order.orderDate || order.date || new Date().toISOString(),
                            status: 'active',
                            totalOrders: 0,
                            totalSpent: 0,
                            source: 'completed_orders'
                        });
                    }
                    const customer = orderCustomers.get(phone);
                    customer.totalOrders++;
                    customer.totalSpent += order.price || order.amount || 0;
                }
            });

            // Saqlangan mijozlar uchun bajarilgan buyurtmalar statistikalarini yangilash
            savedCustomers.forEach(customer => {
                const customerCompletedOrders = completedOrders.filter(order =>
                    (order.customerPhone || order.phone) === customer.phone
                );
                customer.totalOrders = customerCompletedOrders.length;
                customer.totalSpent = customerCompletedOrders
                    .reduce((sum, order) => sum + (order.price || order.amount || 0), 0);
                customer.lastOrder = customerCompletedOrders.length > 0 ?
                    customerCompletedOrders.sort((a, b) => new Date(b.completedAt || b.date).getTime() - new Date(a.completedAt || a.date).getTime())[0].completedAt :
                    null;
            });

            // Barcha mijozlarni birlashtirish
            const allCustomers = [...savedCustomers, ...Array.from(orderCustomers.values())];

            // Status bo'yicha filter
            let filteredCustomers = allCustomers;
            if (status) {
                filteredCustomers = allCustomers.filter(customer => customer.status === status);
            }

            return filteredCustomers.sort((a, b) => new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime());

        } catch (error) {
            console.error('Error in getCustomersData:', error);
            // Fallback to bot service
            return this.botService.getDashboardCustomers(status);
        }
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
        try {
            const historyFilePath = path.join(process.cwd(), 'completed-orders-history.json');

            if (!fs.existsSync(historyFilePath)) {
                return {
                    labels: ['Dush', 'Sesh', 'Chor', 'Pay', 'Juma', 'Shan', 'Yak'],
                    values: [0, 0, 0, 0, 0, 0, 0],
                    total: 0
                };
            }

            const historyData = fs.readFileSync(historyFilePath, 'utf-8');
            const allHistory = JSON.parse(historyData);

            // Oxirgi 7 kunlik ma'lumotlar
            const today = new Date();
            const last7Days = [];
            const revenues = [];

            for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];

                const dayRevenue = allHistory
                    .filter(order => {
                        const orderDate = new Date(order.completedAt || order.completedDate || order.savedAt).toISOString().split('T')[0];
                        return orderDate === dateStr;
                    })
                    .reduce((sum, order) => sum + (order.price || 0), 0);

                last7Days.push(date.toLocaleDateString('uz-UZ', { weekday: 'short' }));
                revenues.push(dayRevenue / 1000000); // Million so'mda
            }

            return {
                labels: last7Days,
                values: revenues,
                total: revenues.reduce((sum, val) => sum + val, 0)
            };

        } catch (error) {
            console.error('❌ Error getting revenue report:', error);
            return {
                labels: ['Dush', 'Sesh', 'Chor', 'Pay', 'Juma', 'Shan', 'Yak'],
                values: [0, 0, 0, 0, 0, 0, 0],
                total: 0
            };
        }
    }

    private async getOrdersByStatusData() {
        try {
            const historyFilePath = path.join(process.cwd(), 'completed-orders-history.json');

            if (!fs.existsSync(historyFilePath)) {
                return {
                    labels: ['Yakunlangan'],
                    values: [0],
                    colors: ['#2563eb']
                };
            }

            const historyData = fs.readFileSync(historyFilePath, 'utf-8');
            const allHistory = JSON.parse(historyData);

            const completed = allHistory.filter(order => order.status === 'completed').length;

            return {
                labels: ['Yakunlangan'],
                values: [completed],
                colors: ['#2563eb']
            };

        } catch (error) {
            console.error('❌ Error getting orders by status:', error);
            return {
                labels: ['Yakunlangan'],
                values: [0],
                colors: ['#2563eb']
            };
        }
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

            if (result === null) {
                return {
                    success: false,
                    message: 'Buyurtma allaqachon bajarilgan yoki bekor qilingan',
                    error: 'ORDER_NOT_ACTIVE'
                };
            }

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

    @Post('drivers/clear-registration-steps')
    async clearStuckRegistrationSteps() {
        try {
            console.log('🧹 Clearing stuck registration steps...');

            const result = await this.botService.clearStuckRegistrationSteps();

            return {
                success: true,
                message: `${result.clearedCount} ta tiqilib qolgan registratsiya jarayoni tozalandi`,
                data: result
            };
        } catch (error) {
            console.error('❌ Error clearing stuck registration steps:', error);
            return {
                success: false,
                message: 'Registratsiya jarayonlarini tozalashda xatolik yuz berdi',
                error: error.message
            };
        }
    }

    @Get('locations')
    async getLocations() {
        try {
            return {
                success: true,
                data: uzbekistanLocations
            };
        } catch (error) {
            console.error('❌ Error getting locations:', error);
            return {
                success: false,
                error: 'Lokatsiyalarni olishda xatolik',
                data: { regions: [] }
            };
        }
    }

    @Get('locations/:regionId')
    async getRegionDetails(@Param('regionId') regionId: string) {
        try {
            const region = uzbekistanLocations.regions.find(r => r.id === regionId);

            if (!region) {
                return {
                    success: false,
                    error: 'Viloyat topilmadi'
                };
            }

            return {
                success: true,
                data: region
            };
        } catch (error) {
            console.error('❌ Error getting region details:', error);
            return {
                success: false,
                error: 'Viloyat ma\'lumotlarini olishda xatolik'
            };
        }
    }

    @Get('locations/:regionId/districts')
    async getDistrictsByRegion(@Param('regionId') regionId: string) {
        try {
            const region = uzbekistanLocations.regions.find(r => r.id === regionId);

            if (!region) {
                return {
                    success: false,
                    error: 'Viloyat topilmadi',
                    data: []
                };
            }

            return {
                success: true,
                data: region.districts || []
            };
        } catch (error) {
            console.error('❌ Error getting districts:', error);
            return {
                success: false,
                error: 'Tumanlar ma\'lumotlarini olishda xatolik',
                data: []
            };
        }
    }
}