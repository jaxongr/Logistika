export interface DriverPayment {
  id: string;
  driverId: number;
  driverName: string;
  orderId: string;
  orderAmount: number;
  commissionRate: number;
  commissionAmount: number;
  netPayment: number;
  paymentDate: string;
  paymentMethod: 'cash' | 'bank_transfer' | 'card' | 'click' | 'payme';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  invoiceNumber: string;
  taxAmount: number;
  fuelCost?: number;
  additionalCosts?: number;
  bonusAmount?: number;
  penaltyAmount?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Commission {
  id: string;
  driverId: number;
  orderId: string;
  baseAmount: number;
  rate: number;
  amount: number;
  type: 'percentage' | 'fixed' | 'tiered';
  category: 'standard' | 'premium' | 'express' | 'bulk';
  calculatedAt: string;
  approvedBy?: number;
  approvedAt?: string;
}

export interface PaymentSettings {
  defaultCommissionRate: number;
  minimumPayment: number;
  paymentSchedule: 'daily' | 'weekly' | 'monthly';
  autoPayoutEnabled: boolean;
  taxRate: number;
  currency: 'UZS' | 'USD';
  paymentMethods: string[];
}

export interface DriverBalance {
  driverId: number;
  totalEarnings: number;
  totalCommissions: number;
  pendingPayments: number;
  completedPayments: number;
  currentBalance: number;
  lastPaymentDate: string;
  nextPaymentDate: string;
}

export interface PaymentReport {
  period: string;
  totalOrders: number;
  totalRevenue: number;
  totalCommissions: number;
  totalPayments: number;
  averageOrderValue: number;
  topPerformers: Array<{
    driverId: number;
    driverName: string;
    orders: number;
    earnings: number;
  }>;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  driverId: number;
  driverName: string;
  orders: string[];
  totalAmount: number;
  taxAmount: number;
  netAmount: number;
  issueDate: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paymentMethod?: string;
  paidAt?: string;
}