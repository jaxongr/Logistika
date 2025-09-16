import { Injectable } from '@nestjs/common';
import { DataService } from './data.service';
import * as bcrypt from 'bcrypt';

export interface StaffMember {
    id: string;
    username: string;
    password?: string; // Will be hashed
    email: string;
    fullName: string;
    phone?: string;
    role: 'super_admin' | 'admin' | 'moderator' | 'operator' | 'analyst';
    permissions: string[];
    status: 'active' | 'inactive' | 'suspended';
    createdAt: string;
    lastLogin?: string;
    lastActivity?: string;
    createdBy: string;
    department?: string;
    notes?: string;
    avatar?: string;
}

export interface StaffStats {
    totalStaff: number;
    activeStaff: number;
    onlineStaff: number;
    staffByRole: {
        super_admin: number;
        admin: number;
        moderator: number;
        operator: number;
        analyst: number;
    };
    staffByStatus: {
        active: number;
        inactive: number;
        suspended: number;
    };
    recentLogins: number;
}

// Role permissions mapping
const ROLE_PERMISSIONS = {
    super_admin: [
        'manage_staff', 'manage_system', 'manage_orders', 'manage_drivers',
        'manage_customers', 'manage_payments', 'view_analytics', 'manage_settings',
        'export_data', 'manage_backups'
    ],
    admin: [
        'manage_orders', 'manage_drivers', 'manage_customers', 'manage_payments',
        'view_analytics', 'manage_settings', 'export_data'
    ],
    moderator: [
        'manage_orders', 'manage_drivers', 'manage_customers', 'view_analytics'
    ],
    operator: [
        'view_orders', 'view_drivers', 'view_customers', 'create_orders'
    ],
    analyst: [
        'view_analytics', 'view_orders', 'view_drivers', 'view_customers', 'export_data'
    ]
};

@Injectable()
export class StaffService {
    constructor(private readonly dataService: DataService) {}

    async getAllStaff(filters?: {
        role?: string;
        status?: string;
        search?: string;
        department?: string;
        limit?: number;
        offset?: number;
    }): Promise<{ staff: StaffMember[]; total: number }> {
        try {
            const staffData = await this.dataService.readData('staff', { staff: [] });
            let staff = staffData.staff as StaffMember[];

            // Remove password from response
            staff = staff.map(member => {
                const { password, ...staffWithoutPassword } = member;
                return staffWithoutPassword;
            });

            // Apply filters
            if (filters?.role) {
                staff = staff.filter(member => member.role === filters.role);
            }

            if (filters?.status) {
                staff = staff.filter(member => member.status === filters.status);
            }

            if (filters?.department) {
                staff = staff.filter(member => member.department === filters.department);
            }

            if (filters?.search) {
                const searchLower = filters.search.toLowerCase();
                staff = staff.filter(member =>
                    member.fullName.toLowerCase().includes(searchLower) ||
                    member.username.toLowerCase().includes(searchLower) ||
                    member.email.toLowerCase().includes(searchLower) ||
                    member.phone?.includes(filters.search)
                );
            }

            const total = staff.length;

            // Apply pagination
            if (filters?.limit) {
                const offset = filters.offset || 0;
                staff = staff.slice(offset, offset + filters.limit);
            }

            return { staff, total };
        } catch (error) {
            console.error('Error getting staff:', error);
            return { staff: [], total: 0 };
        }
    }

    async getStaffById(staffId: string): Promise<StaffMember | null> {
        try {
            const staffData = await this.dataService.readData('staff', { staff: [] });
            const staff = staffData.staff.find((s: StaffMember) => s.id === staffId);

            if (staff) {
                const { password, ...staffWithoutPassword } = staff;
                return staffWithoutPassword as StaffMember;
            }

            return null;
        } catch (error) {
            console.error('Error getting staff by ID:', error);
            return null;
        }
    }

    async getStaffByUsername(username: string): Promise<StaffMember | null> {
        try {
            const staffData = await this.dataService.readData('staff', { staff: [] });
            const staff = staffData.staff.find((s: StaffMember) => s.username === username);
            return staff || null;
        } catch (error) {
            console.error('Error getting staff by username:', error);
            return null;
        }
    }

    async createStaff(staffData: Omit<StaffMember, 'id' | 'createdAt' | 'permissions'>): Promise<StaffMember> {
        try {
            // Hash password
            const hashedPassword = await bcrypt.hash(staffData.password!, 10);

            const newStaff: StaffMember = {
                ...staffData,
                id: this.generateStaffId(),
                password: hashedPassword,
                createdAt: new Date().toISOString(),
                permissions: ROLE_PERMISSIONS[staffData.role] || [],
                status: 'active'
            };

            await this.dataService.updateData('staff', (data: any) => {
                if (!data.staff) data.staff = [];
                data.staff.push(newStaff);
                return data;
            }, { staff: [] });

            // Return without password
            const { password, ...staffWithoutPassword } = newStaff;
            return staffWithoutPassword as StaffMember;
        } catch (error) {
            console.error('Error creating staff:', error);
            throw error;
        }
    }

    async updateStaff(staffId: string, updates: Partial<StaffMember>): Promise<StaffMember | null> {
        try {
            let updatedStaff: StaffMember | null = null;

            // If password is being updated, hash it
            if (updates.password) {
                updates.password = await bcrypt.hash(updates.password, 10);
            }

            // Update permissions if role is changed
            if (updates.role) {
                updates.permissions = ROLE_PERMISSIONS[updates.role] || [];
            }

            await this.dataService.updateData('staff', (data: any) => {
                if (!data.staff) data.staff = [];

                const staffIndex = data.staff.findIndex((s: StaffMember) => s.id === staffId);
                if (staffIndex === -1) return data;

                data.staff[staffIndex] = {
                    ...data.staff[staffIndex],
                    ...updates,
                    lastActivity: new Date().toISOString()
                };

                updatedStaff = data.staff[staffIndex];
                return data;
            }, { staff: [] });

            if (updatedStaff) {
                const { password, ...staffWithoutPassword } = updatedStaff;
                return staffWithoutPassword as StaffMember;
            }

            return null;
        } catch (error) {
            console.error('Error updating staff:', error);
            return null;
        }
    }

    async deleteStaff(staffId: string): Promise<boolean> {
        try {
            let deleted = false;

            await this.dataService.updateData('staff', (data: any) => {
                if (!data.staff) data.staff = [];

                const initialLength = data.staff.length;
                data.staff = data.staff.filter((s: StaffMember) => s.id !== staffId);
                deleted = data.staff.length < initialLength;

                return data;
            }, { staff: [] });

            return deleted;
        } catch (error) {
            console.error('Error deleting staff:', error);
            return false;
        }
    }

    async updateStaffStatus(staffId: string, status: 'active' | 'inactive' | 'suspended'): Promise<boolean> {
        try {
            const staff = await this.updateStaff(staffId, { status });
            return !!staff;
        } catch (error) {
            console.error('Error updating staff status:', error);
            return false;
        }
    }

    async authenticateStaff(username: string, password: string): Promise<StaffMember | null> {
        try {
            const staff = await this.getStaffByUsername(username);
            if (!staff || !staff.password) return null;

            const isValidPassword = await bcrypt.compare(password, staff.password);
            if (!isValidPassword) return null;

            // Update last login
            await this.updateStaff(staff.id, {
                lastLogin: new Date().toISOString(),
                lastActivity: new Date().toISOString()
            });

            const { password: _, ...staffWithoutPassword } = staff;
            return staffWithoutPassword as StaffMember;
        } catch (error) {
            console.error('Error authenticating staff:', error);
            return null;
        }
    }

    async getStaffStats(): Promise<StaffStats> {
        try {
            const staffData = await this.dataService.readData('staff', { staff: [] });
            const staff = staffData.staff as StaffMember[];

            const today = new Date();
            const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

            const recentLogins = staff.filter(member =>
                member.lastLogin && new Date(member.lastLogin) >= todayStart
            ).length;

            const staffByRole = {
                super_admin: staff.filter(s => s.role === 'super_admin').length,
                admin: staff.filter(s => s.role === 'admin').length,
                moderator: staff.filter(s => s.role === 'moderator').length,
                operator: staff.filter(s => s.role === 'operator').length,
                analyst: staff.filter(s => s.role === 'analyst').length
            };

            const staffByStatus = {
                active: staff.filter(s => s.status === 'active').length,
                inactive: staff.filter(s => s.status === 'inactive').length,
                suspended: staff.filter(s => s.status === 'suspended').length
            };

            // Check who's been active in last 30 minutes (consider as online)
            const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
            const onlineStaff = staff.filter(member =>
                member.lastActivity && new Date(member.lastActivity) >= thirtyMinutesAgo
            ).length;

            return {
                totalStaff: staff.length,
                activeStaff: staffByStatus.active,
                onlineStaff,
                staffByRole,
                staffByStatus,
                recentLogins
            };
        } catch (error) {
            console.error('Error getting staff stats:', error);
            return {
                totalStaff: 0,
                activeStaff: 0,
                onlineStaff: 0,
                staffByRole: { super_admin: 0, admin: 0, moderator: 0, operator: 0, analyst: 0 },
                staffByStatus: { active: 0, inactive: 0, suspended: 0 },
                recentLogins: 0
            };
        }
    }

    async getStaffPermissions(staffId: string): Promise<string[]> {
        try {
            const staff = await this.getStaffById(staffId);
            return staff?.permissions || [];
        } catch (error) {
            console.error('Error getting staff permissions:', error);
            return [];
        }
    }

    async hasPermission(staffId: string, permission: string): Promise<boolean> {
        try {
            const permissions = await this.getStaffPermissions(staffId);
            return permissions.includes(permission);
        } catch (error) {
            console.error('Error checking staff permission:', error);
            return false;
        }
    }

    async getStaffActivity(staffId: string, days: number = 30): Promise<any[]> {
        try {
            // This would integrate with activity logging system
            // For now, return empty array
            return [];
        } catch (error) {
            console.error('Error getting staff activity:', error);
            return [];
        }
    }

    async changePassword(staffId: string, currentPassword: string, newPassword: string): Promise<boolean> {
        try {
            const staffData = await this.dataService.readData('staff', { staff: [] });
            const staff = staffData.staff.find((s: StaffMember) => s.id === staffId);

            if (!staff || !staff.password) return false;

            const isValidCurrentPassword = await bcrypt.compare(currentPassword, staff.password);
            if (!isValidCurrentPassword) return false;

            const hashedNewPassword = await bcrypt.hash(newPassword, 10);
            const updated = await this.updateStaff(staffId, { password: hashedNewPassword });

            return !!updated;
        } catch (error) {
            console.error('Error changing password:', error);
            return false;
        }
    }

    private generateStaffId(): string {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        return `staff_${timestamp}_${random}`;
    }

    async getDepartments(): Promise<string[]> {
        try {
            const staffData = await this.dataService.readData('staff', { staff: [] });
            const staff = staffData.staff as StaffMember[];

            const departments = [...new Set(staff
                .map(s => s.department)
                .filter(dept => dept && dept.trim())
            )];

            return departments;
        } catch (error) {
            console.error('Error getting departments:', error);
            return [];
        }
    }

    async initializeSuperAdmin(): Promise<void> {
        try {
            const existingSuperAdmin = await this.getStaffByUsername('superadmin');
            if (existingSuperAdmin) return;

            await this.createStaff({
                username: 'superadmin',
                password: 'admin123456',
                email: 'admin@logimaster.uz',
                fullName: 'Super Administrator',
                role: 'super_admin',
                status: 'active',
                createdBy: 'system',
                department: 'IT'
            });

            console.log('✅ Super admin initialized');
        } catch (error) {
            console.error('Error initializing super admin:', error);
        }
    }
}