export interface CommissionRule {
    id: string;
    name: string;
    type: 'percentage' | 'fixed' | 'daily' | 'weekly' | 'monthly';
    value: number;
    description: string;
    isActive: boolean;
    conditions?: {
        minAmount?: number;
        maxAmount?: number;
        driverCategory?: 'standard' | 'premium' | 'vip';
        orderType?: string[];
        regions?: string[];
        timeRange?: {
            start: string;
            end: string;
        };
    };
    createdAt: string;
    updatedAt: string;
}

export interface CommissionRates {
    standard?: number;
    premium?: number;
    rules: CommissionRule[];
    defaultRule: string; // rule ID
    lastUpdated: string;
}

export interface DriverCommission {
    driverId: string;
    driverName: string;
    driverCategory?: 'standard' | 'premium' | 'vip';
    totalEarnings: number;
    commissionDeducted: number;
    netAmount: number;
    commissionRate?: number;
    appliedRules?: Array<{
        ruleId: string;
        ruleName: string;
        amount: number;
        calculation: string;
    }>;
    orderCount: number;
    lastPayment: string;
}

export interface CommissionCalculation {
    orderId?: string;
    driverId: string;
    originalAmount: number;
    appliedRules: Array<{
        ruleId: string;
        ruleName: string;
        type: string;
        value: number;
        commissionAmount: number;
        calculation: string;
    }>;
    totalCommission: number;
    netAmount: number;
    calculatedAt: string;
}