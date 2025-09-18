import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { StaffMember, Role, Permission, Department, StaffAuditLog } from './interfaces/staff.interfaces';

@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);
  private readonly staffFilePath = path.join(process.cwd(), 'staff-members.json');
  private readonly rolesFilePath = path.join(process.cwd(), 'staff-roles.json');
  private readonly permissionsFilePath = path.join(process.cwd(), 'staff-permissions.json');
  private readonly departmentsFilePath = path.join(process.cwd(), 'staff-departments.json');
  private readonly auditLogPath = path.join(process.cwd(), 'staff-audit-log.json');

  async createStaffMember(staffData: Partial<StaffMember>, createdBy: number): Promise<StaffMember> {
    try {
      this.logger.log(`👤 Creating new staff member: ${staffData.fullName}`);

      const staff = await this.loadStaffMembers();
      const newId = Math.max(0, ...staff.map(s => s.id)) + 1;

      const roleId = staffData.roleId || 1;
      const roles = await this.loadRoles();
      const role = roles.find(r => r.id === roleId);

      const newStaff: StaffMember = {
        id: newId,
        employeeId: staffData.employeeId || this.generateEmployeeId(),
        username: staffData.username,
        password: staffData.password,
        fullName: staffData.fullName || '',
        email: staffData.email || '',
        phone: staffData.phone || '',
        position: staffData.position || '',
        department: staffData.department || '',
        role: role ? role.name : 'Employee',
        roleId: roleId,
        permissions: await this.calculatePermissions(roleId),
        salary: staffData.salary || 0,
        hireDate: staffData.hireDate || new Date().toISOString(),
        status: 'active',
        avatar: staffData.avatar,
        address: staffData.address,
        emergencyContact: staffData.emergencyContact,
        bankDetails: staffData.bankDetails,
        performance: {
          rating: 0,
          lastReview: '',
          goals: []
        },
        schedule: staffData.schedule || {
          workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          startTime: '09:00',
          endTime: '18:00',
          timeZone: 'Asia/Tashkent'
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy
      };

      staff.push(newStaff);
      await this.saveStaffMembers(staff);

      // Log the action
      await this.logAction(newId, 'create', 'staff_member', newId.toString(), null, newStaff, createdBy);

      this.logger.log(`✅ Staff member created: ${newStaff.fullName} (ID: ${newId})`);
      return newStaff;

    } catch (error) {
      this.logger.error('Error creating staff member:', error);
      throw error;
    }
  }

  async updateStaffMember(id: number, updateData: Partial<StaffMember>, updatedBy: number): Promise<StaffMember> {
    try {
      const staff = await this.loadStaffMembers();
      const staffIndex = staff.findIndex(s => s.id === id);

      if (staffIndex === -1) {
        throw new NotFoundException('Staff member not found');
      }

      const oldValues = { ...staff[staffIndex] };

      // Update permissions if role changed
      if (updateData.roleId && updateData.roleId !== staff[staffIndex].roleId) {
        updateData.permissions = await this.calculatePermissions(updateData.roleId);
      }

      staff[staffIndex] = {
        ...staff[staffIndex],
        ...updateData,
        updatedAt: new Date().toISOString()
      };

      await this.saveStaffMembers(staff);

      // Log the action
      await this.logAction(id, 'update', 'staff_member', id.toString(), oldValues, staff[staffIndex], updatedBy);

      this.logger.log(`✅ Staff member updated: ${staff[staffIndex].fullName}`);
      return staff[staffIndex];

    } catch (error) {
      this.logger.error('Error updating staff member:', error);
      throw error;
    }
  }

  async getStaffMember(id: number): Promise<StaffMember> {
    try {
      const staff = await this.loadStaffMembers();
      const staffMember = staff.find(s => s.id === id);

      if (!staffMember) {
        throw new NotFoundException('Staff member not found');
      }

      return staffMember;
    } catch (error) {
      throw error;
    }
  }

  async getAllStaff(filters?: {
    department?: string;
    role?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ staff: StaffMember[], total: number }> {
    try {
      let staff = await this.loadStaffMembers();
      const total = staff.length;

      if (filters) {
        if (filters.department) {
          staff = staff.filter(s => s.department === filters.department);
        }

        if (filters.role) {
          const roles = await this.loadRoles();
          const role = roles.find(r => r.name.toLowerCase() === filters.role.toLowerCase());
          if (role) {
            staff = staff.filter(s => s.roleId === role.id);
          }
        }

        if (filters.status) {
          staff = staff.filter(s => s.status === filters.status);
        }

        if (filters.search) {
          const searchTerm = filters.search.toLowerCase();
          staff = staff.filter(s =>
            s.fullName.toLowerCase().includes(searchTerm) ||
            s.email.toLowerCase().includes(searchTerm) ||
            s.position.toLowerCase().includes(searchTerm) ||
            s.employeeId.toLowerCase().includes(searchTerm)
          );
        }

        if (filters.limit || filters.offset) {
          const offset = filters.offset || 0;
          const limit = filters.limit || 50;
          staff = staff.slice(offset, offset + limit);
        }
      }

      return {
        staff: staff.sort((a, b) => a.fullName.localeCompare(b.fullName)),
        total
      };
    } catch (error) {
      this.logger.error('Error getting staff members:', error);
      return { staff: [], total: 0 };
    }
  }

  async deleteStaffMember(id: number, deletedBy: number): Promise<boolean> {
    try {
      const staff = await this.loadStaffMembers();
      const staffIndex = staff.findIndex(s => s.id === id);

      if (staffIndex === -1) {
        throw new NotFoundException('Staff member not found');
      }

      const deletedStaff = staff[staffIndex];

      // Instead of hard delete, mark as terminated
      staff[staffIndex].status = 'terminated';
      staff[staffIndex].updatedAt = new Date().toISOString();

      await this.saveStaffMembers(staff);

      // Log the action
      await this.logAction(id, 'delete', 'staff_member', id.toString(), deletedStaff, null, deletedBy);

      this.logger.log(`✅ Staff member terminated: ${deletedStaff.fullName}`);
      return true;

    } catch (error) {
      this.logger.error('Error deleting staff member:', error);
      throw error;
    }
  }

  // Role Management
  async createRole(roleData: Partial<Role>, createdBy: number): Promise<Role> {
    try {
      this.logger.log(`🔐 Creating new role: ${roleData.name}`);

      const roles = await this.loadRoles();
      const newId = Math.max(0, ...roles.map(r => r.id)) + 1;

      const newRole: Role = {
        id: newId,
        name: roleData.name || '',
        description: roleData.description || '',
        permissions: roleData.permissions || [],
        level: roleData.level || 1,
        isSystem: false,
        color: roleData.color || '#6B7280',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      roles.push(newRole);
      await this.saveRoles(roles);

      // Log the action
      await this.logAction(newId, 'create', 'role', newId.toString(), null, newRole, createdBy);

      this.logger.log(`✅ Role created: ${newRole.name}`);
      return newRole;

    } catch (error) {
      this.logger.error('Error creating role:', error);
      throw error;
    }
  }

  async updateRole(id: number, updateData: Partial<Role>, updatedBy: number): Promise<Role> {
    try {
      const roles = await this.loadRoles();
      const roleIndex = roles.findIndex(r => r.id === id);

      if (roleIndex === -1) {
        throw new NotFoundException('Role not found');
      }

      if (roles[roleIndex].isSystem) {
        throw new BadRequestException('Cannot modify system roles');
      }

      const oldValues = { ...roles[roleIndex] };

      roles[roleIndex] = {
        ...roles[roleIndex],
        ...updateData,
        updatedAt: new Date().toISOString()
      };

      await this.saveRoles(roles);

      // Update staff permissions who have this role
      await this.updateStaffPermissionsForRole(id);

      // Log the action
      await this.logAction(id, 'update', 'role', id.toString(), oldValues, roles[roleIndex], updatedBy);

      this.logger.log(`✅ Role updated: ${roles[roleIndex].name}`);
      return roles[roleIndex];

    } catch (error) {
      this.logger.error('Error updating role:', error);
      throw error;
    }
  }

  async getAllRoles(): Promise<Role[]> {
    try {
      return await this.loadRoles();
    } catch (error) {
      return [];
    }
  }

  async getRole(id: number): Promise<Role> {
    try {
      const roles = await this.loadRoles();
      const role = roles.find(r => r.id === id);

      if (!role) {
        throw new NotFoundException('Role not found');
      }

      return role;
    } catch (error) {
      throw error;
    }
  }

  // Permission Management
  async getAllPermissions(): Promise<Permission[]> {
    try {
      return await this.loadPermissions();
    } catch (error) {
      return [];
    }
  }

  async checkPermission(staffId: number, resource: string, action: string): Promise<boolean> {
    try {
      const staff = await this.getStaffMember(staffId);
      const permissions = staff.permissions;

      // Check for specific permission
      const hasPermission = permissions.some(permission => {
        const [permResource, permAction] = permission.split('.');
        return (permResource === resource || permResource === '*') &&
               (permAction === action || permAction === 'all' || permAction === '*');
      });

      return hasPermission;
    } catch (error) {
      this.logger.error(`Permission check failed for staff ${staffId}:`, error);
      return false;
    }
  }

  // Department Management
  async createDepartment(deptData: Partial<Department>, createdBy: number): Promise<Department> {
    try {
      const departments = await this.loadDepartments();
      const newId = Math.max(0, ...departments.map(d => d.id)) + 1;

      const newDepartment: Department = {
        id: newId,
        name: deptData.name || '',
        description: deptData.description || '',
        managerId: deptData.managerId,
        budget: deptData.budget,
        costCenter: deptData.costCenter,
        location: deptData.location,
        staffCount: 0,
        createdAt: new Date().toISOString()
      };

      departments.push(newDepartment);
      await this.saveDepartments(departments);

      // Log the action
      await this.logAction(newId, 'create', 'department', newId.toString(), null, newDepartment, createdBy);

      this.logger.log(`✅ Department created: ${newDepartment.name}`);
      return newDepartment;

    } catch (error) {
      this.logger.error('Error creating department:', error);
      throw error;
    }
  }

  async getAllDepartments(): Promise<Department[]> {
    try {
      const departments = await this.loadDepartments();

      // Update staff counts
      const staff = await this.loadStaffMembers();
      departments.forEach(dept => {
        dept.staffCount = staff.filter(s => s.department === dept.name && s.status === 'active').length;
      });

      return departments;
    } catch (error) {
      return [];
    }
  }

  // Additional methods for controller compatibility
  async getStaffStats(): Promise<any> {
    try {
      const staff = await this.loadStaffMembers();
      const roles = await this.loadRoles();

      const activeStaff = staff.filter(s => s.status === 'active');
      const staffByRole = {};
      const staffByStatus = {};

      roles.forEach(role => {
        staffByRole[role.name.toLowerCase().replace(' ', '_')] = staff.filter(s => s.roleId === role.id && s.status === 'active').length;
      });

      ['active', 'inactive', 'suspended'].forEach(status => {
        staffByStatus[status] = staff.filter(s => s.status === status).length;
      });

      // Calculate recent logins (mock data for now)
      const recentLogins = Math.floor(activeStaff.length * 0.8);

      return {
        totalStaff: staff.length,
        activeStaff: activeStaff.length,
        onlineStaff: Math.floor(activeStaff.length * 0.6), // Mock online count
        staffByRole,
        staffByStatus,
        recentLogins
      };
    } catch (error) {
      this.logger.error('Error getting staff stats:', error);
      throw error;
    }
  }

  async getDepartments(): Promise<Department[]> {
    return this.getAllDepartments();
  }

  async getStaffById(staffId: string): Promise<StaffMember | null> {
    try {
      const id = parseInt(staffId);
      return await this.getStaffMember(id);
    } catch (error) {
      return null;
    }
  }

  async getStaffActivity(staffId: string, days: number): Promise<any> {
    try {
      // Mock activity data for now
      const activityData = [];
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        activityData.push({
          date: date.toISOString().split('T')[0],
          hoursWorked: 7 + Math.random() * 3,
          tasksCompleted: Math.floor(Math.random() * 10),
          loginTime: '09:00',
          logoutTime: '18:00'
        });
      }
      return activityData;
    } catch (error) {
      this.logger.error('Error getting staff activity:', error);
      throw error;
    }
  }

  async getStaffPermissions(staffId: string): Promise<string[]> {
    try {
      const staff = await this.getStaffById(staffId);
      return staff ? staff.permissions : [];
    } catch (error) {
      this.logger.error('Error getting staff permissions:', error);
      return [];
    }
  }

  async getStaffByUsername(username: string): Promise<StaffMember | null> {
    try {
      const staff = await this.loadStaffMembers();
      return staff.find(s => s.username === username || s.employeeId === username || s.email === username) || null;
    } catch (error) {
      return null;
    }
  }

  async createStaff(staffData: any): Promise<StaffMember> {
    return this.createStaffMember(staffData, 1); // Using system user as creator
  }

  async updateStaff(staffId: string, updates: Partial<StaffMember>): Promise<StaffMember> {
    const id = parseInt(staffId);
    return this.updateStaffMember(id, updates, 1);
  }

  async updateStaffStatus(staffId: string, status: string): Promise<boolean> {
    try {
      const id = parseInt(staffId);
      await this.updateStaffMember(id, { status: status as 'active' | 'inactive' | 'suspended' | 'terminated' }, 1);
      return true;
    } catch (error) {
      return false;
    }
  }

  async changePassword(staffId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      // Mock password change for now
      const staff = await this.getStaffById(staffId);
      if (!staff) return false;

      // In a real implementation, you would verify the current password
      // and hash the new password before saving
      this.logger.log(`Password changed for staff: ${staff.fullName}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  async deleteStaff(staffId: string): Promise<boolean> {
    const id = parseInt(staffId);
    return this.deleteStaffMember(id, 1);
  }

  async authenticateStaff(username: string, password: string): Promise<StaffMember | null> {
    try {
      // Mock authentication for now
      const staff = await this.getStaffByUsername(username);
      if (!staff || staff.status !== 'active') return null;

      // In a real implementation, you would verify the password hash
      this.logger.log(`Staff authenticated: ${staff.fullName}`);
      return staff;
    } catch (error) {
      return null;
    }
  }

  async hasPermission(staffId: string, permission: string): Promise<boolean> {
    try {
      const id = parseInt(staffId);
      const [resource, action] = permission.split('.');
      return this.checkPermission(id, resource, action);
    } catch (error) {
      return false;
    }
  }

  async initializeSuperAdmin(): Promise<void> {
    try {
      // Check if super admin already exists
      const staff = await this.loadStaffMembers();
      const superAdmin = staff.find(s => s.roleId === 1);

      if (!superAdmin) {
        await this.initializeStaffData();
        this.logger.log('Super admin initialized');
      }
    } catch (error) {
      this.logger.error('Error initializing super admin:', error);
      throw error;
    }
  }

  // Analytics and Reporting
  async getStaffAnalytics(period: string): Promise<any> {
    try {
      const staff = await this.loadStaffMembers();
      const roles = await this.loadRoles();
      const departments = await this.loadDepartments();

      const analytics = {
        totalStaff: staff.filter(s => s.status === 'active').length,
        totalInactive: staff.filter(s => s.status !== 'active').length,
        departmentBreakdown: this.calculateDepartmentBreakdown(staff, departments),
        roleBreakdown: this.calculateRoleBreakdown(staff, roles),
        averageSalary: this.calculateAverageSalary(staff),
        newHires: this.getNewHires(staff, period),
        turnoverRate: this.calculateTurnoverRate(staff, period),
        performanceOverview: this.getPerformanceOverview(staff),
        upcomingReviews: this.getUpcomingReviews(staff),
        salaryExpense: this.calculateSalaryExpense(staff)
      };

      return analytics;
    } catch (error) {
      this.logger.error('Error calculating staff analytics:', error);
      throw error;
    }
  }

  async getAuditLog(staffId?: number, limit = 100): Promise<StaffAuditLog[]> {
    try {
      const logs = await this.loadAuditLog();
      let filtered = logs;

      if (staffId) {
        filtered = logs.filter(log => log.staffId === staffId);
      }

      return filtered
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);

    } catch (error) {
      this.logger.error('Error loading audit log:', error);
      return [];
    }
  }

  // Private helper methods
  private async calculatePermissions(roleId: number): Promise<string[]> {
    try {
      const role = await this.getRole(roleId);
      return role.permissions.map(p => `${p.resource}.${p.action}`);
    } catch (error) {
      return [];
    }
  }

  private async updateStaffPermissionsForRole(roleId: number): Promise<void> {
    try {
      const staff = await this.loadStaffMembers();
      const updatedPermissions = await this.calculatePermissions(roleId);

      const staffWithRole = staff.filter(s => s.roleId === roleId);

      for (const staffMember of staffWithRole) {
        staffMember.permissions = updatedPermissions;
        staffMember.updatedAt = new Date().toISOString();
      }

      await this.saveStaffMembers(staff);
    } catch (error) {
      this.logger.error('Error updating staff permissions:', error);
    }
  }

  private generateEmployeeId(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `EMP${timestamp}${random}`;
  }

  private calculateDepartmentBreakdown(staff: StaffMember[], departments: Department[]): any {
    const breakdown: { [key: string]: number } = {};

    departments.forEach(dept => {
      breakdown[dept.name] = staff.filter(s =>
        s.department === dept.name && s.status === 'active'
      ).length;
    });

    return breakdown;
  }

  private calculateRoleBreakdown(staff: StaffMember[], roles: Role[]): any {
    const breakdown: { [key: string]: number } = {};

    roles.forEach(role => {
      breakdown[role.name] = staff.filter(s =>
        s.roleId === role.id && s.status === 'active'
      ).length;
    });

    return breakdown;
  }

  private calculateAverageSalary(staff: StaffMember[]): number {
    const activeStaff = staff.filter(s => s.status === 'active' && s.salary > 0);
    if (activeStaff.length === 0) return 0;

    const totalSalary = activeStaff.reduce((sum, s) => sum + s.salary, 0);
    return Math.round(totalSalary / activeStaff.length);
  }

  private getNewHires(staff: StaffMember[], period: string): number {
    const startDate = this.getPeriodStartDate(period);
    return staff.filter(s =>
      new Date(s.hireDate) >= startDate && s.status === 'active'
    ).length;
  }

  private calculateTurnoverRate(staff: StaffMember[], period: string): number {
    const startDate = this.getPeriodStartDate(period);
    const totalStaff = staff.filter(s => s.status === 'active').length;
    const terminated = staff.filter(s =>
      s.status === 'terminated' && new Date(s.updatedAt) >= startDate
    ).length;

    if (totalStaff === 0) return 0;
    return Math.round((terminated / totalStaff) * 100);
  }

  private getPerformanceOverview(staff: StaffMember[]): any {
    const activeStaff = staff.filter(s => s.status === 'active');
    const withRatings = activeStaff.filter(s => s.performance?.rating && s.performance.rating > 0);

    if (withRatings.length === 0) {
      return { averageRating: 0, distribution: {} };
    }

    const totalRating = withRatings.reduce((sum, s) => sum + (s.performance?.rating || 0), 0);
    const averageRating = totalRating / withRatings.length;

    const distribution = {
      excellent: withRatings.filter(s => (s.performance?.rating || 0) >= 4.5).length,
      good: withRatings.filter(s => (s.performance?.rating || 0) >= 3.5 && (s.performance?.rating || 0) < 4.5).length,
      average: withRatings.filter(s => (s.performance?.rating || 0) >= 2.5 && (s.performance?.rating || 0) < 3.5).length,
      poor: withRatings.filter(s => (s.performance?.rating || 0) < 2.5).length
    };

    return { averageRating: Math.round(averageRating * 100) / 100, distribution };
  }

  private getUpcomingReviews(staff: StaffMember[]): number {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    return staff.filter(s => {
      if (!s.performance?.lastReview) return true; // Never reviewed

      const lastReview = new Date(s.performance.lastReview);
      const nextReview = new Date(lastReview);
      nextReview.setFullYear(nextReview.getFullYear() + 1); // Annual reviews

      return nextReview <= nextMonth;
    }).length;
  }

  private calculateSalaryExpense(staff: StaffMember[]): number {
    return staff
      .filter(s => s.status === 'active')
      .reduce((sum, s) => sum + s.salary, 0);
  }

  private getPeriodStartDate(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'quarter':
        const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
        return new Date(now.getFullYear(), quarterMonth, 1);
      case 'year':
        return new Date(now.getFullYear(), 0, 1);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  private async logAction(
    staffId: number,
    action: string,
    resource: string,
    resourceId: string,
    oldValues: any,
    newValues: any,
    performedBy: number
  ): Promise<void> {
    try {
      const logs = await this.loadAuditLog();

      const logEntry: StaffAuditLog = {
        id: Math.max(0, ...logs.map(l => l.id)) + 1,
        staffId,
        action,
        resource,
        resourceId,
        oldValues,
        newValues,
        ipAddress: '127.0.0.1', // In production, get from request
        userAgent: 'Staff Management System',
        performedBy,
        timestamp: new Date().toISOString()
      };

      logs.push(logEntry);

      // Keep only last 10000 logs
      if (logs.length > 10000) {
        logs.splice(0, logs.length - 10000);
      }

      await this.saveAuditLog(logs);
    } catch (error) {
      this.logger.error('Error logging action:', error);
    }
  }

  // File operations
  private async loadStaffMembers(): Promise<StaffMember[]> {
    try {
      if (!fs.existsSync(this.staffFilePath)) {
        await this.initializeStaffData();
      }
      const data = fs.readFileSync(this.staffFilePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  private async saveStaffMembers(staff: StaffMember[]): Promise<void> {
    fs.writeFileSync(this.staffFilePath, JSON.stringify(staff, null, 2));
  }

  private async loadRoles(): Promise<Role[]> {
    try {
      if (!fs.existsSync(this.rolesFilePath)) {
        await this.initializeRolesData();
      }
      const data = fs.readFileSync(this.rolesFilePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  private async saveRoles(roles: Role[]): Promise<void> {
    fs.writeFileSync(this.rolesFilePath, JSON.stringify(roles, null, 2));
  }

  private async loadPermissions(): Promise<Permission[]> {
    try {
      if (!fs.existsSync(this.permissionsFilePath)) {
        await this.initializePermissionsData();
      }
      const data = fs.readFileSync(this.permissionsFilePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  private async savePermissions(permissions: Permission[]): Promise<void> {
    fs.writeFileSync(this.permissionsFilePath, JSON.stringify(permissions, null, 2));
  }

  private async loadDepartments(): Promise<Department[]> {
    try {
      if (!fs.existsSync(this.departmentsFilePath)) {
        await this.initializeDepartmentsData();
      }
      const data = fs.readFileSync(this.departmentsFilePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  private async saveDepartments(departments: Department[]): Promise<void> {
    fs.writeFileSync(this.departmentsFilePath, JSON.stringify(departments, null, 2));
  }

  private async loadAuditLog(): Promise<StaffAuditLog[]> {
    try {
      if (!fs.existsSync(this.auditLogPath)) {
        return [];
      }
      const data = fs.readFileSync(this.auditLogPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  private async saveAuditLog(logs: StaffAuditLog[]): Promise<void> {
    fs.writeFileSync(this.auditLogPath, JSON.stringify(logs, null, 2));
  }

  // Initialize default data
  private async initializeStaffData(): Promise<void> {
    const defaultStaff: StaffMember[] = [
      {
        id: 1,
        employeeId: 'EMP000001',
        username: 'admin',
        password: 'admin123',
        fullName: 'Avtohabar Admin',
        email: 'admin@avtohabar.uz',
        phone: '+998901234567',
        position: 'System Administrator',
        department: 'IT',
        role: 'Super Admin',
        roleId: 1,
        permissions: ['*.*'],
        salary: 15000000,
        hireDate: new Date().toISOString(),
        status: 'active',
        schedule: {
          workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          startTime: '09:00',
          endTime: '18:00',
          timeZone: 'Asia/Tashkent'
        },
        performance: {
          rating: 5,
          lastReview: new Date().toISOString(),
          goals: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 1
      }
    ];

    await this.saveStaffMembers(defaultStaff);
  }

  private async initializeRolesData(): Promise<void> {
    const defaultRoles: Role[] = [
      {
        id: 1,
        name: 'Super Admin',
        description: 'Full system access',
        permissions: await this.getDefaultPermissions(),
        level: 5,
        isSystem: true,
        color: '#DC2626',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 2,
        name: 'Manager',
        description: 'Management access',
        permissions: await this.getManagerPermissions(),
        level: 4,
        isSystem: true,
        color: '#2563EB',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 3,
        name: 'Supervisor',
        description: 'Supervisory access',
        permissions: await this.getSupervisorPermissions(),
        level: 3,
        isSystem: true,
        color: '#059669',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 4,
        name: 'Employee',
        description: 'Basic employee access',
        permissions: await this.getEmployeePermissions(),
        level: 2,
        isSystem: true,
        color: '#7C3AED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    await this.saveRoles(defaultRoles);
  }

  private async initializePermissionsData(): Promise<void> {
    const defaultPermissions: Permission[] = [
      // Dashboard permissions
      { id: 1, name: 'View Dashboard', description: 'Access to main dashboard', category: 'Dashboard', resource: 'dashboard', action: 'read' },
      { id: 2, name: 'View Analytics', description: 'Access to analytics data', category: 'Dashboard', resource: 'analytics', action: 'read' },

      // Orders permissions
      { id: 10, name: 'View Orders', description: 'View order listings', category: 'Orders', resource: 'orders', action: 'read' },
      { id: 11, name: 'Create Orders', description: 'Create new orders', category: 'Orders', resource: 'orders', action: 'create' },
      { id: 12, name: 'Update Orders', description: 'Modify existing orders', category: 'Orders', resource: 'orders', action: 'update' },
      { id: 13, name: 'Delete Orders', description: 'Delete orders', category: 'Orders', resource: 'orders', action: 'delete' },

      // Drivers permissions
      { id: 20, name: 'View Drivers', description: 'View driver information', category: 'Drivers', resource: 'drivers', action: 'read' },
      { id: 21, name: 'Manage Drivers', description: 'Add/edit driver information', category: 'Drivers', resource: 'drivers', action: 'update' },

      // Customers permissions
      { id: 30, name: 'View Customers', description: 'View customer information', category: 'Customers', resource: 'customers', action: 'read' },
      { id: 31, name: 'Manage Customers', description: 'Add/edit customer information', category: 'Customers', resource: 'customers', action: 'update' },

      // Finance permissions
      { id: 40, name: 'View Finances', description: 'View financial data', category: 'Finance', resource: 'finance', action: 'read' },
      { id: 41, name: 'Manage Payments', description: 'Process payments', category: 'Finance', resource: 'payments', action: 'update' },
      { id: 42, name: 'View Reports', description: 'Access financial reports', category: 'Finance', resource: 'reports', action: 'read' },

      // Staff permissions
      { id: 50, name: 'View Staff', description: 'View staff information', category: 'Staff', resource: 'staff', action: 'read' },
      { id: 51, name: 'Manage Staff', description: 'Add/edit staff members', category: 'Staff', resource: 'staff', action: 'update' },
      { id: 52, name: 'Manage Roles', description: 'Create and modify roles', category: 'Staff', resource: 'roles', action: 'all' },

      // System permissions
      { id: 60, name: 'System Settings', description: 'Access system settings', category: 'System', resource: 'settings', action: 'all' },
      { id: 61, name: 'Audit Logs', description: 'View audit logs', category: 'System', resource: 'audit', action: 'read' },

      // Full access
      { id: 99, name: 'Full Access', description: 'Complete system access', category: 'System', resource: '*', action: 'all' }
    ];

    await this.savePermissions(defaultPermissions);
  }

  private async initializeDepartmentsData(): Promise<void> {
    const defaultDepartments: Department[] = [
      {
        id: 1,
        name: 'IT',
        description: 'Information Technology Department',
        staffCount: 0,
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        name: 'Operations',
        description: 'Operations and Logistics Department',
        staffCount: 0,
        createdAt: new Date().toISOString()
      },
      {
        id: 3,
        name: 'Finance',
        description: 'Finance and Accounting Department',
        staffCount: 0,
        createdAt: new Date().toISOString()
      },
      {
        id: 4,
        name: 'Customer Service',
        description: 'Customer Support Department',
        staffCount: 0,
        createdAt: new Date().toISOString()
      },
      {
        id: 5,
        name: 'Management',
        description: 'Executive Management',
        staffCount: 0,
        createdAt: new Date().toISOString()
      }
    ];

    await this.saveDepartments(defaultDepartments);
  }

  private async getDefaultPermissions(): Promise<Permission[]> {
    return [{ id: 99, name: 'Full Access', description: 'Complete system access', category: 'System', resource: '*', action: 'all' }];
  }

  private async getManagerPermissions(): Promise<Permission[]> {
    const permissions = await this.loadPermissions();
    return permissions.filter(p =>
      p.category !== 'System' || p.resource === 'audit'
    );
  }

  private async getSupervisorPermissions(): Promise<Permission[]> {
    const permissions = await this.loadPermissions();
    return permissions.filter(p =>
      ['Dashboard', 'Orders', 'Drivers', 'Customers'].includes(p.category) &&
      p.action !== 'delete'
    );
  }

  private async getEmployeePermissions(): Promise<Permission[]> {
    const permissions = await this.loadPermissions();
    return permissions.filter(p =>
      ['Dashboard', 'Orders', 'Customers'].includes(p.category) &&
      p.action === 'read'
    );
  }
}