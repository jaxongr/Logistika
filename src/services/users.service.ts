import { Injectable } from '@nestjs/common';
import { DataService } from './data.service';
import * as bcrypt from 'bcrypt';

export interface User {
    id: string;
    telegramId: number;
    name: string;
    username: string;
    password?: string; // Will be hashed, not returned in responses
    phone?: string;
    role: 'admin' | 'moderator' | 'operator';
    status: 'active' | 'inactive' | 'blocked';
    joinDate: string;
    lastActivity?: string;
    balance?: number;
    rating?: number;
    totalOrders?: number;
    completedOrders?: number;
    cancelledOrders?: number;
    allowedOrders?: string[]; // Order IDs this user can edit
    location?: {
        city?: string;
        region?: string;
    };
    vehicle?: {
        type?: string;
        model?: string;
        number?: string;
        capacity?: number;
    };
    company?: string;
    referralCode?: string;
    referredBy?: string;
    metadata?: any;
}

export interface UserPermissions {
    canViewOrders: boolean;
    canEditOwnOrders: boolean;
    canEditAllOrders: boolean;
    canViewDrivers: boolean;
    canEditDrivers: boolean;
    canViewFinance: boolean;
    canEditFinance: boolean;
    canViewUsers: boolean;
    canEditUsers: boolean;
    allowedSections: string[];
}

export interface UserStats {
    totalUsers: number;
    activeUsers: number;
    newUsersToday: number;
    usersByRole: {
        admins: number;
        moderators: number;
        operators: number;
    };
    usersByStatus: {
        active: number;
        inactive: number;
        blocked: number;
    };
}

@Injectable()
export class UsersService {
    constructor(private readonly dataService: DataService) {}

    async getAllUsers(filters?: {
        role?: string;
        status?: string;
        search?: string;
        limit?: number;
        offset?: number;
    }): Promise<{ users: User[]; total: number }> {
        try {
            const usersData = await this.dataService.readData('users', { users: [] });
            let users = usersData.users as User[];

            // Remove password from response
            users = users.map(user => {
                const { password, ...userWithoutPassword } = user;
                return userWithoutPassword;
            });

            // Apply filters
            if (filters?.role) {
                users = users.filter(user => user.role === filters.role);
            }

            if (filters?.status) {
                users = users.filter(user => user.status === filters.status);
            }

            if (filters?.search) {
                const searchLower = filters.search.toLowerCase();
                users = users.filter(user =>
                    user.name.toLowerCase().includes(searchLower) ||
                    user.phone?.includes(filters.search) ||
                    user.id.includes(filters.search)
                );
            }

            const total = users.length;

            // Apply pagination
            if (filters?.limit) {
                const offset = filters.offset || 0;
                users = users.slice(offset, offset + filters.limit);
            }

            return { users, total };
        } catch (error) {
            console.error('Error getting users:', error);
            return { users: [], total: 0 };
        }
    }

    async getUserById(userId: string): Promise<User | null> {
        try {
            const usersData = await this.dataService.readData('users', { users: [] });
            const user = usersData.users.find((u: User) => u.id === userId);

            if (user) {
                const { password, ...userWithoutPassword } = user;
                return userWithoutPassword as User;
            }
            return null;
        } catch (error) {
            console.error('Error getting user by ID:', error);
            return null;
        }
    }

    async getUserByTelegramId(telegramId: number): Promise<User | null> {
        try {
            const usersData = await this.dataService.readData('users', { users: [] });
            const user = usersData.users.find((u: User) => u.telegramId === telegramId);
            return user || null;
        } catch (error) {
            console.error('Error getting user by Telegram ID:', error);
            return null;
        }
    }

    async getUserByUsername(username: string): Promise<User | null> {
        try {
            const usersData = await this.dataService.readData('users', { users: [] });
            const user = usersData.users.find((u: User) => u.username === username);

            if (user) {
                const { password, ...userWithoutPassword } = user;
                return userWithoutPassword as User;
            }
            return null;
        } catch (error) {
            console.error('Error getting user by username:', error);
            return null;
        }
    }

    async createUser(userData: Omit<User, 'id' | 'joinDate'>): Promise<User> {
        try {
            // Hash password if provided
            let hashedPassword: string | undefined;
            if (userData.password) {
                hashedPassword = await bcrypt.hash(userData.password, 10);
            }

            const newUser: User = {
                ...userData,
                password: hashedPassword,
                id: this.generateUserId(),
                joinDate: new Date().toISOString(),
                status: 'active',
                lastActivity: new Date().toISOString()
            };

            await this.dataService.updateData('users', (data: any) => {
                if (!data.users) data.users = [];
                data.users.push(newUser);
                return data;
            }, { users: [] });

            // Return without password
            const { password, ...userWithoutPassword } = newUser;
            return userWithoutPassword as User;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
        try {
            let updatedUser: User | null = null;

            await this.dataService.updateData('users', (data: any) => {
                if (!data.users) data.users = [];

                const userIndex = data.users.findIndex((u: User) => u.id === userId);
                if (userIndex === -1) return data;

                data.users[userIndex] = {
                    ...data.users[userIndex],
                    ...updates,
                    lastActivity: new Date().toISOString()
                };

                updatedUser = data.users[userIndex];
                return data;
            }, { users: [] });

            return updatedUser;
        } catch (error) {
            console.error('Error updating user:', error);
            return null;
        }
    }

    async deleteUser(userId: string): Promise<boolean> {
        try {
            let deleted = false;

            await this.dataService.updateData('users', (data: any) => {
                if (!data.users) data.users = [];

                const initialLength = data.users.length;
                data.users = data.users.filter((u: User) => u.id !== userId);
                deleted = data.users.length < initialLength;

                return data;
            }, { users: [] });

            return deleted;
        } catch (error) {
            console.error('Error deleting user:', error);
            return false;
        }
    }

    async updateUserStatus(userId: string, status: 'active' | 'inactive' | 'blocked'): Promise<boolean> {
        try {
            const user = await this.updateUser(userId, { status });
            return !!user;
        } catch (error) {
            console.error('Error updating user status:', error);
            return false;
        }
    }

    async updateUserBalance(userId: string, amount: number): Promise<boolean> {
        try {
            const user = await this.getUserById(userId);
            if (!user) return false;

            const currentBalance = user.balance || 0;
            const newBalance = currentBalance + amount;

            const updatedUser = await this.updateUser(userId, { balance: newBalance });

            if (updatedUser) {
                // Add balance history
                await this.dataService.addBalanceHistory(
                    userId,
                    amount,
                    amount > 0 ? 'credit' : 'debit',
                    `Dashboard: ${amount > 0 ? 'Balans to\'ldirildi' : 'Jarima yechildi'}`
                );
            }

            return !!updatedUser;
        } catch (error) {
            console.error('Error updating user balance:', error);
            return false;
        }
    }

    async getUserStats(): Promise<UserStats> {
        try {
            const usersData = await this.dataService.readData('users', { users: [] });
            const users = usersData.users as User[];

            const today = new Date().toDateString();
            const newUsersToday = users.filter(user =>
                new Date(user.joinDate).toDateString() === today
            ).length;

            const usersByRole = {
                admins: users.filter(u => u.role === 'admin').length,
                moderators: users.filter(u => u.role === 'moderator').length,
                operators: users.filter(u => u.role === 'operator').length
            };

            const usersByStatus = {
                active: users.filter(u => u.status === 'active').length,
                inactive: users.filter(u => u.status === 'inactive').length,
                blocked: users.filter(u => u.status === 'blocked').length
            };

            return {
                totalUsers: users.length,
                activeUsers: usersByStatus.active,
                newUsersToday,
                usersByRole,
                usersByStatus
            };
        } catch (error) {
            console.error('Error getting user stats:', error);
            return {
                totalUsers: 0,
                activeUsers: 0,
                newUsersToday: 0,
                usersByRole: { admins: 0, moderators: 0, operators: 0 },
                usersByStatus: { active: 0, inactive: 0, blocked: 0 }
            };
        }
    }

    async getUserActivity(userId: string, days: number = 30): Promise<any[]> {
        try {
            // Bot service'dan foydalanuvchi faoliyatini olish
            // Bu yerda real implementation bo'lishi kerak
            return [];
        } catch (error) {
            console.error('Error getting user activity:', error);
            return [];
        }
    }

    async searchUsers(query: string, role?: string): Promise<User[]> {
        try {
            const filters = {
                search: query,
                role,
                limit: 50
            };

            const result = await this.getAllUsers(filters);
            return result.users;
        } catch (error) {
            console.error('Error searching users:', error);
            return [];
        }
    }

    private generateUserId(): string {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        return `user_${timestamp}_${random}`;
    }

    async getUsersByDateRange(startDate: string, endDate: string): Promise<User[]> {
        try {
            const usersData = await this.dataService.readData('users', { users: [] });
            const users = usersData.users as User[];

            const start = new Date(startDate);
            const end = new Date(endDate);

            return users.filter(user => {
                const joinDate = new Date(user.joinDate);
                return joinDate >= start && joinDate <= end;
            });
        } catch (error) {
            console.error('Error getting users by date range:', error);
            return [];
        }
    }

    async getTopUsers(type: 'balance' | 'orders' | 'rating', limit: number = 10): Promise<User[]> {
        try {
            const usersData = await this.dataService.readData('users', { users: [] });
            let users = usersData.users as User[];

            switch (type) {
                case 'balance':
                    users = users.sort((a, b) => (b.balance || 0) - (a.balance || 0));
                    break;
                case 'orders':
                    users = users.sort((a, b) => (b.totalOrders || 0) - (a.totalOrders || 0));
                    break;
                case 'rating':
                    users = users.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                    break;
            }

            return users.slice(0, limit);
        } catch (error) {
            console.error('Error getting top users:', error);
            return [];
        }
    }

    async migrateFromBotData(): Promise<{ migrated: number; errors: number }> {
        try {
            // Bot service'dagi foydalanuvchi ma'lumotlarini Users service'ga ko'chirish
            // Bu method'ni keyinroq bot service bilan integratsiya qilgandan keyin implement qilishimiz mumkin

            return { migrated: 0, errors: 0 };
        } catch (error) {
            console.error('Error migrating users from bot data:', error);
            return { migrated: 0, errors: 1 };
        }
    }

    getUserPermissions(role: string): UserPermissions {
        switch (role) {
            case 'admin':
                return {
                    canViewOrders: true,
                    canEditOwnOrders: true,
                    canEditAllOrders: true,
                    canViewDrivers: true,
                    canEditDrivers: true,
                    canViewFinance: true,
                    canEditFinance: true,
                    canViewUsers: true,
                    canEditUsers: true,
                    allowedSections: ['dashboard', 'orders', 'drivers', 'dispatchers', 'customers', 'users', 'staff', 'finance']
                };
            case 'moderator':
                return {
                    canViewOrders: true,
                    canEditOwnOrders: true,
                    canEditAllOrders: true,
                    canViewDrivers: true,
                    canEditDrivers: true,
                    canViewFinance: false,
                    canEditFinance: false,
                    canViewUsers: true,
                    canEditUsers: false,
                    allowedSections: ['dashboard', 'orders', 'drivers', 'dispatchers', 'customers']
                };
            case 'operator':
                return {
                    canViewOrders: true,
                    canEditOwnOrders: true,
                    canEditAllOrders: false,
                    canViewDrivers: true,
                    canEditDrivers: false,
                    canViewFinance: false,
                    canEditFinance: false,
                    canViewUsers: false,
                    canEditUsers: false,
                    allowedSections: ['dashboard', 'orders', 'drivers']
                };
            default:
                return {
                    canViewOrders: false,
                    canEditOwnOrders: false,
                    canEditAllOrders: false,
                    canViewDrivers: false,
                    canEditDrivers: false,
                    canViewFinance: false,
                    canEditFinance: false,
                    canViewUsers: false,
                    canEditUsers: false,
                    allowedSections: []
                };
        }
    }

    async assignOrderToUser(userId: string, orderId: string): Promise<boolean> {
        try {
            const user = await this.getUserById(userId);
            if (!user) return false;

            const allowedOrders = user.allowedOrders || [];
            if (!allowedOrders.includes(orderId)) {
                allowedOrders.push(orderId);
                await this.updateUser(userId, { allowedOrders });
            }

            return true;
        } catch (error) {
            console.error('Error assigning order to user:', error);
            return false;
        }
    }

    async removeOrderFromUser(userId: string, orderId: string): Promise<boolean> {
        try {
            const user = await this.getUserById(userId);
            if (!user) return false;

            const allowedOrders = (user.allowedOrders || []).filter(id => id !== orderId);
            await this.updateUser(userId, { allowedOrders });

            return true;
        } catch (error) {
            console.error('Error removing order from user:', error);
            return false;
        }
    }

    async canUserEditOrder(userId: string, orderId: string): Promise<boolean> {
        try {
            const user = await this.getUserById(userId);
            if (!user) return false;

            const permissions = this.getUserPermissions(user.role);

            // Admin can edit all orders
            if (permissions.canEditAllOrders) return true;

            // Others can only edit their assigned orders
            return permissions.canEditOwnOrders && (user.allowedOrders || []).includes(orderId);
        } catch (error) {
            console.error('Error checking user order permissions:', error);
            return false;
        }
    }
}