import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpStatus, HttpException } from '@nestjs/common';
import { StaffService, StaffMember } from '../services/staff.service';

@Controller('api/dashboard/staff')
export class StaffController {
    constructor(private readonly staffService: StaffService) {}

    @Get()
    async getAllStaff(
        @Query('role') role?: string,
        @Query('status') status?: string,
        @Query('search') search?: string,
        @Query('department') department?: string,
        @Query('limit') limit?: number,
        @Query('offset') offset?: number
    ) {
        try {
            const filters = {
                role,
                status,
                search,
                department,
                limit: limit ? parseInt(limit.toString()) : undefined,
                offset: offset ? parseInt(offset.toString()) : undefined
            };

            const result = await this.staffService.getAllStaff(filters);

            return {
                success: true,
                data: result.staff,
                total: result.total,
                pagination: {
                    limit: filters.limit,
                    offset: filters.offset,
                    hasMore: filters.limit ? (filters.offset || 0) + filters.limit < result.total : false
                }
            };
        } catch (error) {
            console.error('Error getting staff:', error);
            return {
                success: false,
                message: 'Xodimlar ma\'lumotlarini olishda xatolik',
                error: error.message,
                data: [],
                total: 0
            };
        }
    }

    @Get('stats')
    async getStaffStats() {
        try {
            const stats = await this.staffService.getStaffStats();

            return {
                success: true,
                data: stats
            };
        } catch (error) {
            console.error('Error getting staff stats:', error);
            return {
                success: false,
                message: 'Statistika ma\'lumotlarini olishda xatolik',
                error: error.message,
                data: {
                    totalStaff: 0,
                    activeStaff: 0,
                    onlineStaff: 0,
                    staffByRole: { super_admin: 0, admin: 0, moderator: 0, operator: 0, analyst: 0 },
                    staffByStatus: { active: 0, inactive: 0, suspended: 0 },
                    recentLogins: 0
                }
            };
        }
    }

    @Get('departments')
    async getDepartments() {
        try {
            const departments = await this.staffService.getDepartments();

            return {
                success: true,
                data: departments
            };
        } catch (error) {
            console.error('Error getting departments:', error);
            return {
                success: false,
                message: 'Bo\'limlar ma\'lumotlarini olishda xatolik',
                error: error.message,
                data: []
            };
        }
    }

    @Get('roles')
    async getRoles() {
        try {
            const roles = [
                { value: 'super_admin', label: 'Super Admin', description: 'Barcha huquqlar' },
                { value: 'admin', label: 'Administrator', description: 'Keng huquqlar' },
                { value: 'moderator', label: 'Moderator', description: 'Nazorat va boshqaruv' },
                { value: 'operator', label: 'Operator', description: 'Asosiy operatsiyalar' },
                { value: 'analyst', label: 'Tahlilchi', description: 'Ma\'lumotlar tahlili' }
            ];

            return {
                success: true,
                data: roles
            };
        } catch (error) {
            return {
                success: false,
                message: 'Rollar ma\'lumotlarini olishda xatolik',
                data: []
            };
        }
    }

    @Get(':id')
    async getStaffById(@Param('id') staffId: string) {
        try {
            const staff = await this.staffService.getStaffById(staffId);

            if (!staff) {
                throw new HttpException('Xodim topilmadi', HttpStatus.NOT_FOUND);
            }

            return {
                success: true,
                data: staff
            };
        } catch (error) {
            console.error('Error getting staff by ID:', error);

            if (error instanceof HttpException) {
                throw error;
            }

            return {
                success: false,
                message: 'Xodim ma\'lumotlarini olishda xatolik',
                error: error.message,
                data: null
            };
        }
    }

    @Get(':id/activity')
    async getStaffActivity(
        @Param('id') staffId: string,
        @Query('days') days?: number
    ) {
        try {
            const staff = await this.staffService.getStaffById(staffId);
            if (!staff) {
                throw new HttpException('Xodim topilmadi', HttpStatus.NOT_FOUND);
            }

            const activityDays = days ? parseInt(days.toString()) : 30;
            const activity = await this.staffService.getStaffActivity(staffId, activityDays);

            return {
                success: true,
                data: {
                    staffId,
                    staffName: staff.fullName,
                    period: `${activityDays} kun`,
                    activity
                }
            };
        } catch (error) {
            console.error('Error getting staff activity:', error);

            if (error instanceof HttpException) {
                throw error;
            }

            return {
                success: false,
                message: 'Xodim faoliyati ma\'lumotlarini olishda xatolik',
                error: error.message,
                data: null
            };
        }
    }

    @Get(':id/permissions')
    async getStaffPermissions(@Param('id') staffId: string) {
        try {
            const permissions = await this.staffService.getStaffPermissions(staffId);

            return {
                success: true,
                data: {
                    staffId,
                    permissions
                }
            };
        } catch (error) {
            console.error('Error getting staff permissions:', error);
            return {
                success: false,
                message: 'Xodim huquqlari ma\'lumotlarini olishda xatolik',
                error: error.message,
                data: null
            };
        }
    }

    @Post()
    async createStaff(@Body() staffData: Omit<StaffMember, 'id' | 'createdAt' | 'permissions'>) {
        try {
            // Validate required fields
            if (!staffData.username || !staffData.password || !staffData.email ||
                !staffData.fullName || !staffData.role) {
                throw new HttpException('Kerakli maydonlar to\'ldirilmagan', HttpStatus.BAD_REQUEST);
            }

            // Check if username already exists
            const existingStaff = await this.staffService.getStaffByUsername(staffData.username);
            if (existingStaff) {
                throw new HttpException('Bu username mavjud', HttpStatus.CONFLICT);
            }

            const newStaff = await this.staffService.createStaff(staffData);

            return {
                success: true,
                message: 'Xodim muvaffaqiyatli yaratildi',
                data: newStaff
            };
        } catch (error) {
            console.error('Error creating staff:', error);

            if (error instanceof HttpException) {
                throw error;
            }

            return {
                success: false,
                message: 'Xodim yaratishda xatolik',
                error: error.message,
                data: null
            };
        }
    }

    @Put(':id')
    async updateStaff(
        @Param('id') staffId: string,
        @Body() updates: Partial<StaffMember>
    ) {
        try {
            // Don't allow changing ID, createdAt through this endpoint
            delete updates.id;
            delete updates.createdAt;

            const updatedStaff = await this.staffService.updateStaff(staffId, updates);

            if (!updatedStaff) {
                throw new HttpException('Xodim topilmadi', HttpStatus.NOT_FOUND);
            }

            return {
                success: true,
                message: 'Xodim ma\'lumotlari yangilandi',
                data: updatedStaff
            };
        } catch (error) {
            console.error('Error updating staff:', error);

            if (error instanceof HttpException) {
                throw error;
            }

            return {
                success: false,
                message: 'Xodim ma\'lumotlarini yangilashda xatolik',
                error: error.message,
                data: null
            };
        }
    }

    @Put(':id/status')
    async updateStaffStatus(
        @Param('id') staffId: string,
        @Body('status') status: 'active' | 'inactive' | 'suspended'
    ) {
        try {
            const validStatuses = ['active', 'inactive', 'suspended'];
            if (!validStatuses.includes(status)) {
                throw new HttpException('Noto\'g\'ri status qiymati', HttpStatus.BAD_REQUEST);
            }

            const success = await this.staffService.updateStaffStatus(staffId, status);

            if (!success) {
                throw new HttpException('Xodim topilmadi', HttpStatus.NOT_FOUND);
            }

            return {
                success: true,
                message: `Xodim status ${this.getStatusText(status)} ga o'zgartirildi`,
                data: { staffId, status }
            };
        } catch (error) {
            console.error('Error updating staff status:', error);

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

    @Put(':id/password')
    async changePassword(
        @Param('id') staffId: string,
        @Body() passwordData: { currentPassword: string; newPassword: string }
    ) {
        try {
            if (!passwordData.currentPassword || !passwordData.newPassword) {
                throw new HttpException('Joriy va yangi parol talab qilinadi', HttpStatus.BAD_REQUEST);
            }

            if (passwordData.newPassword.length < 6) {
                throw new HttpException('Yangi parol kamida 6 ta belgidan iborat bo\'lishi kerak', HttpStatus.BAD_REQUEST);
            }

            const success = await this.staffService.changePassword(
                staffId,
                passwordData.currentPassword,
                passwordData.newPassword
            );

            if (!success) {
                throw new HttpException('Joriy parol noto\'g\'ri yoki xodim topilmadi', HttpStatus.BAD_REQUEST);
            }

            return {
                success: true,
                message: 'Parol muvaffaqiyatli o\'zgartirildi'
            };
        } catch (error) {
            console.error('Error changing password:', error);

            if (error instanceof HttpException) {
                throw error;
            }

            return {
                success: false,
                message: 'Parol o\'zgartirishda xatolik',
                error: error.message
            };
        }
    }

    @Delete(':id')
    async deleteStaff(@Param('id') staffId: string) {
        try {
            const success = await this.staffService.deleteStaff(staffId);

            if (!success) {
                throw new HttpException('Xodim topilmadi', HttpStatus.NOT_FOUND);
            }

            return {
                success: true,
                message: 'Xodim o\'chirildi',
                data: { staffId }
            };
        } catch (error) {
            console.error('Error deleting staff:', error);

            if (error instanceof HttpException) {
                throw error;
            }

            return {
                success: false,
                message: 'Xodimni o\'chirishda xatolik',
                error: error.message
            };
        }
    }

    @Post('authenticate')
    async authenticateStaff(@Body() loginData: { username: string; password: string }) {
        try {
            if (!loginData.username || !loginData.password) {
                throw new HttpException('Username va parol talab qilinadi', HttpStatus.BAD_REQUEST);
            }

            const staff = await this.staffService.authenticateStaff(loginData.username, loginData.password);

            if (!staff) {
                throw new HttpException('Username yoki parol noto\'g\'ri', HttpStatus.UNAUTHORIZED);
            }

            return {
                success: true,
                message: 'Muvaffaqiyatli autentifikatsiya',
                data: staff
            };
        } catch (error) {
            console.error('Error authenticating staff:', error);

            if (error instanceof HttpException) {
                throw error;
            }

            return {
                success: false,
                message: 'Autentifikatsiyada xatolik',
                error: error.message,
                data: null
            };
        }
    }

    @Post('check-permission')
    async checkPermission(@Body() permissionData: { staffId: string; permission: string }) {
        try {
            if (!permissionData.staffId || !permissionData.permission) {
                throw new HttpException('StaffId va permission talab qilinadi', HttpStatus.BAD_REQUEST);
            }

            const hasPermission = await this.staffService.hasPermission(
                permissionData.staffId,
                permissionData.permission
            );

            return {
                success: true,
                data: {
                    staffId: permissionData.staffId,
                    permission: permissionData.permission,
                    hasPermission
                }
            };
        } catch (error) {
            console.error('Error checking permission:', error);
            return {
                success: false,
                message: 'Huquq tekshirishda xatolik',
                error: error.message,
                data: { hasPermission: false }
            };
        }
    }

    @Post('initialize')
    async initializeSuperAdmin() {
        try {
            await this.staffService.initializeSuperAdmin();

            return {
                success: true,
                message: 'Super admin initialized'
            };
        } catch (error) {
            console.error('Error initializing super admin:', error);
            return {
                success: false,
                message: 'Super admin yaratishda xatolik',
                error: error.message
            };
        }
    }

    private getStatusText(status: string): string {
        const statusTexts = {
            active: 'Faol',
            inactive: 'Nofaol',
            suspended: 'To\'xtatilgan'
        };
        return statusTexts[status] || status;
    }

    private getRoleText(role: string): string {
        const roleTexts = {
            super_admin: 'Super Admin',
            admin: 'Administrator',
            moderator: 'Moderator',
            operator: 'Operator',
            analyst: 'Tahlilchi'
        };
        return roleTexts[role] || role;
    }
}