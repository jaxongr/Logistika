export interface StaffMember {
  id: number;
  employeeId: string;
  username?: string;
  password?: string;
  fullName: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  role: string;
  roleId: number;
  permissions: string[];
  salary: number;
  hireDate: string;
  status: 'active' | 'inactive' | 'suspended' | 'terminated';
  avatar?: string;
  address?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  bankDetails?: {
    accountNumber: string;
    bankName: string;
    accountHolder: string;
  };
  performance?: {
    rating: number;
    lastReview: string;
    goals: string[];
  };
  schedule?: {
    workDays: string[];
    startTime: string;
    endTime: string;
    timeZone: string;
  };
  createdAt: string;
  updatedAt: string;
  createdBy: number;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions: Permission[];
  level: number; // 1=basic, 2=supervisor, 3=manager, 4=admin, 5=owner
  isSystem: boolean;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: number;
  name: string;
  description: string;
  category: string;
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'execute' | 'all';
  conditions?: any;
}

export interface Department {
  id: number;
  name: string;
  description: string;
  managerId?: number;
  budget?: number;
  costCenter?: string;
  location?: string;
  staffCount: number;
  createdAt: string;
}

export interface StaffAttendance {
  id: number;
  staffId: number;
  date: string;
  checkIn?: string;
  checkOut?: string;
  breakStart?: string;
  breakEnd?: string;
  hoursWorked: number;
  overtimeHours: number;
  status: 'present' | 'absent' | 'late' | 'half_day' | 'sick' | 'vacation';
  notes?: string;
  approvedBy?: number;
  createdAt: string;
}

export interface StaffPerformance {
  id: number;
  staffId: number;
  reviewPeriod: string;
  rating: number; // 1-5 scale
  goals: Array<{
    title: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    dueDate: string;
    progress: number;
  }>;
  achievements: string[];
  areasForImprovement: string[];
  feedback: string;
  reviewerId: number;
  nextReviewDate: string;
  createdAt: string;
}

export interface StaffPayroll {
  id: number;
  staffId: number;
  period: string; // YYYY-MM format
  baseSalary: number;
  overtime: number;
  bonuses: number;
  deductions: number;
  netPay: number;
  payDate: string;
  status: 'pending' | 'processed' | 'paid' | 'cancelled';
  payslipPath?: string;
  processedBy: number;
  createdAt: string;
}

export interface StaffShift {
  id: number;
  staffId: number;
  shiftType: 'morning' | 'afternoon' | 'evening' | 'night' | 'custom';
  startTime: string;
  endTime: string;
  date: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  location?: string;
  responsibilities: string[];
  notes?: string;
  createdBy: number;
  createdAt: string;
}

export interface StaffLeave {
  id: number;
  staffId: number;
  leaveType: 'vacation' | 'sick' | 'personal' | 'maternity' | 'paternity' | 'emergency' | 'unpaid';
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approvedBy?: number;
  approvedAt?: string;
  documents?: string[];
  emergencyContact?: string;
  handoverNotes?: string;
  createdAt: string;
}

export interface StaffTraining {
  id: number;
  title: string;
  description: string;
  type: 'orientation' | 'skill_development' | 'compliance' | 'safety' | 'leadership' | 'technical';
  duration: number; // in hours
  instructor?: string;
  location?: string;
  maxParticipants?: number;
  startDate: string;
  endDate: string;
  materials?: string[];
  participants: Array<{
    staffId: number;
    status: 'enrolled' | 'completed' | 'failed' | 'withdrawn';
    score?: number;
    certificateIssued?: boolean;
  }>;
  createdBy: number;
  createdAt: string;
}

export interface StaffAuditLog {
  id: number;
  staffId: number;
  action: string;
  resource: string;
  resourceId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress: string;
  userAgent: string;
  performedBy: number;
  timestamp: string;
}

export interface StaffReport {
  type: 'performance' | 'attendance' | 'payroll' | 'leave' | 'training' | 'custom';
  period: string;
  filters: {
    departments?: number[];
    roles?: number[];
    status?: string[];
    dateRange?: {
      from: string;
      to: string;
    };
  };
  data: any;
  generatedBy: number;
  generatedAt: string;
}

export interface StaffSettings {
  workingHours: {
    start: string;
    end: string;
    timezone: string;
  };
  workingDays: string[];
  leavePolicies: {
    [leaveType: string]: {
      maxDaysPerYear: number;
      carryOverDays: number;
      advanceBookingRequired: boolean;
      approvalRequired: boolean;
    };
  };
  overtimePolicies: {
    enabled: boolean;
    multiplier: number;
    maxHoursPerWeek: number;
    approvalRequired: boolean;
  };
  performanceReviewCycle: 'quarterly' | 'semi_annual' | 'annual';
  probationPeriod: number; // in months
  notificationSettings: {
    email: boolean;
    sms: boolean;
    dashboard: boolean;
  };
}