import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpStatus, HttpException } from '@nestjs/common';
import { UsersService, User, UserPermissions } from '../services/users.service';

@Controller('api/dashboard/users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get()
    async getAllUsers(
        @Query('role') role?: string,
        @Query('status') status?: string,
        @Query('search') search?: string,
        @Query('limit') limit?: number,
        @Query('offset') offset?: number
    ) {
        try {
            const filters = {
                role,
                status,
                search,
                limit: limit ? parseInt(limit.toString()) : undefined,
                offset: offset ? parseInt(offset.toString()) : undefined
            };

            const result = await this.usersService.getAllUsers(filters);

            return {
                success: true,
                data: result.users,
                total: result.total,
                pagination: {
                    limit: filters.limit,
                    offset: filters.offset,
                    hasMore: filters.limit ? (filters.offset || 0) + filters.limit < result.total : false
                }
            };
        } catch (error) {
            console.error('Error getting users:', error);
            return {
                success: false,
                message: 'Foydalanuvchilar ma\'lumotlarini olishda xatolik',
                error: error.message,
                data: [],
                total: 0
            };
        }
    }

    @Get('stats')
    async getUserStats() {
        try {
            const stats = await this.usersService.getUserStats();

            return {
                success: true,
                data: stats
            };
        } catch (error) {
            console.error('Error getting user stats:', error);
            return {
                success: false,
                message: 'Statistika ma\'lumotlarini olishda xatolik',
                error: error.message,
                data: {
                    totalUsers: 0,
                    activeUsers: 0,
                    newUsersToday: 0,
                    usersByRole: { admins: 0, moderators: 0, operators: 0 },
                    usersByStatus: { active: 0, inactive: 0, blocked: 0 }
                }
            };
        }
    }

    @Get('search')
    async searchUsers(
        @Query('q') query: string,
        @Query('role') role?: string
    ) {
        try {
            if (!query || query.trim().length < 2) {
                throw new HttpException('Qidiruv so\'zi kamida 2 ta belgidan iborat bo\'lishi kerak', HttpStatus.BAD_REQUEST);
            }

            const users = await this.usersService.searchUsers(query.trim(), role);

            return {
                success: true,
                data: users,
                total: users.length
            };
        } catch (error) {
            console.error('Error searching users:', error);
            return {
                success: false,
                message: 'Qidiruvda xatolik yuz berdi',
                error: error.message,
                data: []
            };
        }
    }

    @Get('top/:type')
    async getTopUsers(
        @Param('type') type: 'balance' | 'orders' | 'rating',
        @Query('limit') limit?: number
    ) {
        try {
            const validTypes = ['balance', 'orders', 'rating'];
            if (!validTypes.includes(type)) {
                throw new HttpException('Noto\'g\'ri type parametri', HttpStatus.BAD_REQUEST);
            }

            const topLimit = limit ? parseInt(limit.toString()) : 10;
            const users = await this.usersService.getTopUsers(type, topLimit);

            return {
                success: true,
                data: users,
                type,
                limit: topLimit
            };
        } catch (error) {
            console.error('Error getting top users:', error);
            return {
                success: false,
                message: 'Top foydalanuvchilar ma\'lumotlarini olishda xatolik',
                error: error.message,
                data: []
            };
        }
    }

    @Get(':id')
    async getUserById(@Param('id') userId: string) {
        try {
            const user = await this.usersService.getUserById(userId);

            if (!user) {
                throw new HttpException('Foydalanuvchi topilmadi', HttpStatus.NOT_FOUND);
            }

            return {
                success: true,
                data: user
            };
        } catch (error) {
            console.error('Error getting user by ID:', error);

            if (error instanceof HttpException) {
                throw error;
            }

            return {
                success: false,
                message: 'Foydalanuvchi ma\'lumotlarini olishda xatolik',
                error: error.message,
                data: null
            };
        }
    }

    @Get(':id/activity')
    async getUserActivity(
        @Param('id') userId: string,
        @Query('days') days?: number
    ) {
        try {
            const user = await this.usersService.getUserById(userId);
            if (!user) {
                throw new HttpException('Foydalanuvchi topilmadi', HttpStatus.NOT_FOUND);
            }

            const activityDays = days ? parseInt(days.toString()) : 30;
            const activity = await this.usersService.getUserActivity(userId, activityDays);

            return {
                success: true,
                data: {
                    userId,
                    userName: user.name,
                    period: `${activityDays} kun`,
                    activity
                }
            };
        } catch (error) {
            console.error('Error getting user activity:', error);

            if (error instanceof HttpException) {
                throw error;
            }

            return {
                success: false,
                message: 'Foydalanuvchi faoliyati ma\'lumotlarini olishda xatolik',
                error: error.message,
                data: null
            };
        }
    }

    @Post()
    async createUser(@Body() userData: Omit<User, 'id' | 'joinDate'>) {
        try {
            // Validate required fields
            if (!userData.name || !userData.username || !userData.password || !userData.role) {
                throw new HttpException('Kerakli maydonlar to\'ldirilmagan', HttpStatus.BAD_REQUEST);
            }

            // Check if user with this username already exists
            const existingUser = await this.usersService.getUserByUsername(userData.username);
            if (existingUser) {
                throw new HttpException('Bu username bilan foydalanuvchi mavjud', HttpStatus.CONFLICT);
            }

            const newUser = await this.usersService.createUser(userData);

            return {
                success: true,
                message: 'Foydalanuvchi muvaffaqiyatli yaratildi',
                data: newUser
            };
        } catch (error) {
            console.error('Error creating user:', error);

            if (error instanceof HttpException) {
                throw error;
            }

            return {
                success: false,
                message: 'Foydalanuvchi yaratishda xatolik',
                error: error.message,
                data: null
            };
        }
    }

    @Put(':id')
    async updateUser(
        @Param('id') userId: string,
        @Body() updates: Partial<User>
    ) {
        try {
            // Don't allow changing ID, joinDate, or telegramId through this endpoint
            delete updates.id;
            delete updates.joinDate;
            delete updates.telegramId;

            const updatedUser = await this.usersService.updateUser(userId, updates);

            if (!updatedUser) {
                throw new HttpException('Foydalanuvchi topilmadi', HttpStatus.NOT_FOUND);
            }

            return {
                success: true,
                message: 'Foydalanuvchi ma\'lumotlari yangilandi',
                data: updatedUser
            };
        } catch (error) {
            console.error('Error updating user:', error);

            if (error instanceof HttpException) {
                throw error;
            }

            return {
                success: false,
                message: 'Foydalanuvchi ma\'lumotlarini yangilashda xatolik',
                error: error.message,
                data: null
            };
        }
    }

    @Put(':id/status')
    async updateUserStatus(
        @Param('id') userId: string,
        @Body('status') status: 'active' | 'inactive' | 'blocked'
    ) {
        try {
            const validStatuses = ['active', 'inactive', 'blocked'];
            if (!validStatuses.includes(status)) {
                throw new HttpException('Noto\'g\'ri status qiymati', HttpStatus.BAD_REQUEST);
            }

            const success = await this.usersService.updateUserStatus(userId, status);

            if (!success) {
                throw new HttpException('Foydalanuvchi topilmadi', HttpStatus.NOT_FOUND);
            }

            return {
                success: true,
                message: `Foydalanuvchi status ${status} ga o'zgartirildi`,
                data: { userId, status }
            };
        } catch (error) {
            console.error('Error updating user status:', error);

            if (error instanceof HttpException) {
                throw error;
            }

            return {
                success: false,
                message: 'Status yangilashda xatolik',
                error: error.message
            };
        }
    }

    @Put(':id/balance')
    async updateUserBalance(
        @Param('id') userId: string,
        @Body() balanceData: { amount: number; reason?: string }
    ) {
        try {
            if (!balanceData.amount || isNaN(balanceData.amount)) {
                throw new HttpException('Balans miqdori noto\'g\'ri', HttpStatus.BAD_REQUEST);
            }

            const success = await this.usersService.updateUserBalance(userId, balanceData.amount);

            if (!success) {
                throw new HttpException('Foydalanuvchi topilmadi', HttpStatus.NOT_FOUND);
            }

            return {
                success: true,
                message: balanceData.amount > 0 ? 'Balans to\'ldirildi' : 'Balansdan yechildi',
                data: {
                    userId,
                    amount: balanceData.amount,
                    reason: balanceData.reason
                }
            };
        } catch (error) {
            console.error('Error updating user balance:', error);

            if (error instanceof HttpException) {
                throw error;
            }

            return {
                success: false,
                message: 'Balans yangilashda xatolik',
                error: error.message
            };
        }
    }

    @Delete(':id')
    async deleteUser(@Param('id') userId: string) {
        try {
            const success = await this.usersService.deleteUser(userId);

            if (!success) {
                throw new HttpException('Foydalanuvchi topilmadi', HttpStatus.NOT_FOUND);
            }

            return {
                success: true,
                message: 'Foydalanuvchi o\'chirildi',
                data: { userId }
            };
        } catch (error) {
            console.error('Error deleting user:', error);

            if (error instanceof HttpException) {
                throw error;
            }

            return {
                success: false,
                message: 'Foydalanuvchini o\'chirishda xatolik',
                error: error.message
            };
        }
    }

    @Get('reports/new-users')
    async getNewUsersReport(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string
    ) {
        try {
            const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
            const end = endDate || new Date().toISOString();

            const users = await this.usersService.getUsersByDateRange(start, end);

            // Group by date
            const groupedByDate = users.reduce((acc, user) => {
                const date = new Date(user.joinDate).toDateString();
                if (!acc[date]) acc[date] = 0;
                acc[date]++;
                return acc;
            }, {});

            const chartData = {
                labels: Object.keys(groupedByDate).sort(),
                values: Object.keys(groupedByDate).sort().map(date => groupedByDate[date])
            };

            return {
                success: true,
                data: {
                    period: { start, end },
                    totalNewUsers: users.length,
                    chartData,
                    users: users.slice(0, 20) // Limit for display
                }
            };
        } catch (error) {
            console.error('Error getting new users report:', error);
            return {
                success: false,
                message: 'Yangi foydalanuvchilar hisobotini olishda xatolik',
                error: error.message,
                data: null
            };
        }
    }

    @Post('migrate')
    async migrateFromBotData() {
        try {
            console.log('🔄 Starting user data migration from bot service...');

            const result = await this.usersService.migrateFromBotData();

            return {
                success: true,
                message: 'Ma\'lumotlar ko\'chirildi',
                data: result
            };
        } catch (error) {
            console.error('Error migrating user data:', error);
            return {
                success: false,
                message: 'Ma\'lumotlarni ko\'chirishda xatolik',
                error: error.message,
                data: { migrated: 0, errors: 1 }
            };
        }
    }

    @Get(':id/permissions')
    async getUserPermissions(@Param('id') userId: string) {
        try {
            const user = await this.usersService.getUserById(userId);
            if (!user) {
                throw new HttpException('Foydalanuvchi topilmadi', HttpStatus.NOT_FOUND);
            }

            const permissions = this.usersService.getUserPermissions(user.role);

            return {
                success: true,
                data: {
                    userId,
                    role: user.role,
                    permissions
                }
            };
        } catch (error) {
            console.error('Error getting user permissions:', error);

            if (error instanceof HttpException) {
                throw error;
            }

            return {
                success: false,
                message: 'Foydalanuvchi huquqlarini olishda xatolik',
                error: error.message,
                data: null
            };
        }
    }

    @Post(':id/orders/:orderId')
    async assignOrderToUser(
        @Param('id') userId: string,
        @Param('orderId') orderId: string
    ) {
        try {
            const success = await this.usersService.assignOrderToUser(userId, orderId);

            if (!success) {
                throw new HttpException('Buyurtmani foydalanuvchiga biriktirish muvaffaqiyatsiz', HttpStatus.BAD_REQUEST);
            }

            return {
                success: true,
                message: 'Buyurtma foydalanuvchiga biriktirildi',
                data: { userId, orderId }
            };
        } catch (error) {
            console.error('Error assigning order to user:', error);

            if (error instanceof HttpException) {
                throw error;
            }

            return {
                success: false,
                message: 'Buyurtmani biriktirishda xatolik',
                error: error.message
            };
        }
    }

    @Delete(':id/orders/:orderId')
    async removeOrderFromUser(
        @Param('id') userId: string,
        @Param('orderId') orderId: string
    ) {
        try {
            const success = await this.usersService.removeOrderFromUser(userId, orderId);

            if (!success) {
                throw new HttpException('Buyurtmani foydalanuvchidan olib tashlash muvaffaqiyatsiz', HttpStatus.BAD_REQUEST);
            }

            return {
                success: true,
                message: 'Buyurtma foydalanuvchidan olib tashlandi',
                data: { userId, orderId }
            };
        } catch (error) {
            console.error('Error removing order from user:', error);

            if (error instanceof HttpException) {
                throw error;
            }

            return {
                success: false,
                message: 'Buyurtmani olib tashlashda xatolik',
                error: error.message
            };
        }
    }

    @Get(':id/orders/:orderId/can-edit')
    async canUserEditOrder(
        @Param('id') userId: string,
        @Param('orderId') orderId: string
    ) {
        try {
            const canEdit = await this.usersService.canUserEditOrder(userId, orderId);

            return {
                success: true,
                data: {
                    userId,
                    orderId,
                    canEdit
                }
            };
        } catch (error) {
            console.error('Error checking order edit permissions:', error);
            return {
                success: false,
                message: 'Huquqlarni tekshirishda xatolik',
                error: error.message,
                data: { canEdit: false }
            };
        }
    }
}