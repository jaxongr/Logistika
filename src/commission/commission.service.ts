import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { CommissionRule, CommissionRates, DriverCommission, CommissionCalculation } from './interfaces/commission.interfaces';

@Injectable()
export class CommissionService {
    private readonly logger = new Logger(CommissionService.name);
    private readonly ratesFilePath = path.join(process.cwd(), 'commission-rates.json');
    private readonly historyFilePath = path.join(process.cwd(), 'commission-history.json');

    async getCurrentRates(): Promise<CommissionRates> {
        try {
            if (!fs.existsSync(this.ratesFilePath)) {
                const defaultRates = this.getDefaultCommissionRates();
                await this.saveRates(defaultRates);
                return defaultRates;
            }

            const data = fs.readFileSync(this.ratesFilePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            this.logger.error('Error loading commission rates:', error);
            return this.getDefaultCommissionRates();
        }
    }

    async updateRates(standard: number, premium: number): Promise<void> {
        try {
            const currentRates = await this.getCurrentRates();
            const rates: CommissionRates = {
                ...currentRates,
                standard,
                premium,
                lastUpdated: new Date().toISOString()
            };

            await this.saveRates(rates);
            this.logger.log(`Commission rates updated: Standard ${standard}%, Premium ${premium}%`);
        } catch (error) {
            this.logger.error('Error updating commission rates:', error);
            throw error;
        }
    }

    async getDriverCommissions(): Promise<DriverCommission[]> {
        try {
            // Load driver data
            const driverDataPath = path.join(process.cwd(), 'user-data.json');
            if (!fs.existsSync(driverDataPath)) {
                return [];
            }

            const userData = JSON.parse(fs.readFileSync(driverDataPath, 'utf8'));
            const drivers = userData.drivers || [];
            const rates = await this.getCurrentRates();

            const driverCommissions: DriverCommission[] = [];

            for (const driver of drivers) {
                const earnings = driver.balance || 0;
                const commissionRate = driver.isPremium ? rates.premium : rates.standard;
                const commissionDeducted = (earnings * commissionRate) / 100;
                const netAmount = earnings - commissionDeducted;

                driverCommissions.push({
                    driverId: driver.id.toString(),
                    driverName: driver.name || driver.first_name || 'Noma\'lum',
                    totalEarnings: earnings,
                    commissionDeducted,
                    netAmount,
                    commissionRate,
                    orderCount: driver.orderCount || 0,
                    lastPayment: driver.lastPayment || new Date().toISOString()
                });
            }

            return driverCommissions.sort((a, b) => b.totalEarnings - a.totalEarnings);
        } catch (error) {
            this.logger.error('Error getting driver commissions:', error);
            return [];
        }
    }

    async calculateCommission(driverId: string, amount: number): Promise<any> {
        try {
            const rates = await this.getCurrentRates();

            // Check if driver is premium
            const driverDataPath = path.join(process.cwd(), 'user-data.json');
            const userData = JSON.parse(fs.readFileSync(driverDataPath, 'utf8'));
            const driver = userData.drivers?.find(d => d.id.toString() === driverId);

            const isPremium = driver?.isPremium || false;
            const commissionRate = isPremium ? rates.premium : rates.standard;
            const commissionAmount = (amount * commissionRate) / 100;
            const netAmount = amount - commissionAmount;

            return {
                originalAmount: amount,
                commissionRate,
                commissionAmount,
                netAmount,
                isPremium
            };
        } catch (error) {
            this.logger.error('Error calculating commission:', error);
            throw error;
        }
    }

    async applyCommission(driverId: string, amount: number, orderId: string): Promise<any> {
        try {
            const calculation = await this.calculateCommission(driverId, amount);

            // Update driver balance
            const driverDataPath = path.join(process.cwd(), 'user-data.json');
            const userData = JSON.parse(fs.readFileSync(driverDataPath, 'utf8'));

            const driverIndex = userData.drivers?.findIndex(d => d.id.toString() === driverId);
            if (driverIndex !== -1) {
                userData.drivers[driverIndex].balance = (userData.drivers[driverIndex].balance || 0) + calculation.netAmount;
                userData.drivers[driverIndex].lastPayment = new Date().toISOString();
                userData.drivers[driverIndex].orderCount = (userData.drivers[driverIndex].orderCount || 0) + 1;

                fs.writeFileSync(driverDataPath, JSON.stringify(userData, null, 2));
            }

            // Save commission history
            await this.saveCommissionHistory({
                driverId,
                orderId,
                originalAmount: amount,
                commissionRate: calculation.commissionRate,
                commissionAmount: calculation.commissionAmount,
                netAmount: calculation.netAmount,
                timestamp: new Date().toISOString()
            });

            this.logger.log(`Commission applied for driver ${driverId}: ${calculation.commissionAmount} from ${amount}`);
            return calculation;
        } catch (error) {
            this.logger.error('Error applying commission:', error);
            throw error;
        }
    }

    private async saveRates(rates: CommissionRates): Promise<void> {
        fs.writeFileSync(this.ratesFilePath, JSON.stringify(rates, null, 2));
    }

    private async saveCommissionHistory(entry: any): Promise<void> {
        try {
            let history = [];
            if (fs.existsSync(this.historyFilePath)) {
                const data = fs.readFileSync(this.historyFilePath, 'utf8');
                history = JSON.parse(data);
            }

            history.push(entry);

            // Keep only last 1000 entries
            if (history.length > 1000) {
                history = history.slice(-1000);
            }

            fs.writeFileSync(this.historyFilePath, JSON.stringify(history, null, 2));
        } catch (error) {
            this.logger.error('Error saving commission history:', error);
        }
    }

    // New flexible commission methods
    async createCommissionRule(ruleData: Partial<CommissionRule>): Promise<CommissionRule> {
        try {
            const rates = await this.getCurrentRates();

            const newRule: CommissionRule = {
                id: this.generateRuleId(),
                name: ruleData.name || 'Yangi qoida',
                type: ruleData.type || 'percentage',
                value: ruleData.value || 0,
                description: ruleData.description || '',
                isActive: ruleData.isActive !== false,
                conditions: ruleData.conditions || {},
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Ensure rules array exists
            if (!rates.rules || !Array.isArray(rates.rules)) {
                rates.rules = [];
            }

            rates.rules.push(newRule);
            rates.lastUpdated = new Date().toISOString();

            await this.saveRates(rates);
            this.logger.log(`Commission rule created: ${newRule.name} (${newRule.type}: ${newRule.value})`);

            return newRule;
        } catch (error) {
            this.logger.error('Error creating commission rule:', error);
            throw error;
        }
    }

    async updateCommissionRule(ruleId: string, updateData: Partial<CommissionRule>): Promise<CommissionRule> {
        try {
            const rates = await this.getCurrentRates();
            const ruleIndex = rates.rules.findIndex(r => r.id === ruleId);

            if (ruleIndex === -1) {
                throw new Error('Komissiya qoidasi topilmadi');
            }

            const updatedRule = {
                ...rates.rules[ruleIndex],
                ...updateData,
                updatedAt: new Date().toISOString()
            };

            rates.rules[ruleIndex] = updatedRule;
            rates.lastUpdated = new Date().toISOString();

            await this.saveRates(rates);
            this.logger.log(`Commission rule updated: ${updatedRule.name}`);

            return updatedRule;
        } catch (error) {
            this.logger.error('Error updating commission rule:', error);
            throw error;
        }
    }

    async deleteCommissionRule(ruleId: string): Promise<boolean> {
        try {
            const rates = await this.getCurrentRates();
            const ruleIndex = rates.rules.findIndex(r => r.id === ruleId);

            if (ruleIndex === -1) {
                throw new Error('Komissiya qoidasi topilmadi');
            }

            // Don't allow deleting default rule
            if (rates.defaultRule === ruleId) {
                throw new Error('Asosiy qoidani o\'chirib bo\'lmaydi');
            }

            const deletedRule = rates.rules[ruleIndex];
            rates.rules.splice(ruleIndex, 1);
            rates.lastUpdated = new Date().toISOString();

            await this.saveRates(rates);
            this.logger.log(`Commission rule deleted: ${deletedRule.name}`);

            return true;
        } catch (error) {
            this.logger.error('Error deleting commission rule:', error);
            throw error;
        }
    }

    async getAllCommissionRules(): Promise<CommissionRule[]> {
        try {
            const rates = await this.getCurrentRates();
            if (!rates || !rates.rules || !Array.isArray(rates.rules)) {
                this.logger.warn('No rules found in rates, returning empty array');
                return [];
            }
            return rates.rules.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        } catch (error) {
            this.logger.error('Error getting commission rules:', error);
            return [];
        }
    }

    async setDefaultRule(ruleId: string): Promise<void> {
        try {
            const rates = await this.getCurrentRates();
            const rule = rates.rules.find(r => r.id === ruleId);

            if (!rule) {
                throw new Error('Komissiya qoidasi topilmadi');
            }

            rates.defaultRule = ruleId;
            rates.lastUpdated = new Date().toISOString();

            await this.saveRates(rates);
            this.logger.log(`Default commission rule set: ${rule.name}`);
        } catch (error) {
            this.logger.error('Error setting default rule:', error);
            throw error;
        }
    }

    async calculateFlexibleCommission(
        driverId: string,
        amount: number,
        orderData?: {
            orderType?: string;
            region?: string;
            orderTime?: string;
            orderId?: string;
        }
    ): Promise<CommissionCalculation> {
        try {
            const rates = await this.getCurrentRates();
            const driverData = await this.getDriverData(driverId);

            const applicableRules = this.findApplicableRules(rates.rules, {
                driverId,
                amount,
                driverCategory: driverData?.category || 'standard',
                orderType: orderData?.orderType,
                region: orderData?.region,
                orderTime: orderData?.orderTime
            });

            const appliedRules = [];
            let totalCommission = 0;

            for (const rule of applicableRules) {
                const commissionAmount = this.calculateRuleCommission(rule, amount, driverData);

                appliedRules.push({
                    ruleId: rule.id,
                    ruleName: rule.name,
                    type: rule.type,
                    value: rule.value,
                    commissionAmount,
                    calculation: this.getCalculationDescription(rule, amount, commissionAmount)
                });

                totalCommission += commissionAmount;
            }

            const calculation: CommissionCalculation = {
                orderId: orderData?.orderId,
                driverId,
                originalAmount: amount,
                appliedRules,
                totalCommission,
                netAmount: amount - totalCommission,
                calculatedAt: new Date().toISOString()
            };

            this.logger.log(`Commission calculated for driver ${driverId}: ${totalCommission} from ${amount}`);
            return calculation;
        } catch (error) {
            this.logger.error('Error calculating flexible commission:', error);
            throw error;
        }
    }

    private findApplicableRules(rules: CommissionRule[], context: any): CommissionRule[] {
        return rules.filter(rule => {
            if (!rule.isActive) return false;

            const conditions = rule.conditions || {};

            // Check amount conditions
            if (conditions.minAmount && context.amount < conditions.minAmount) return false;
            if (conditions.maxAmount && context.amount > conditions.maxAmount) return false;

            // Check driver category
            if (conditions.driverCategory && context.driverCategory !== conditions.driverCategory) return false;

            // Check order type
            if (conditions.orderType && conditions.orderType.length > 0) {
                if (!context.orderType || !conditions.orderType.includes(context.orderType)) return false;
            }

            // Check regions
            if (conditions.regions && conditions.regions.length > 0) {
                if (!context.region || !conditions.regions.includes(context.region)) return false;
            }

            // Check time range
            if (conditions.timeRange && context.orderTime) {
                const orderTime = new Date(context.orderTime).getHours();
                const startHour = parseInt(conditions.timeRange.start.split(':')[0]);
                const endHour = parseInt(conditions.timeRange.end.split(':')[0]);

                if (orderTime < startHour || orderTime > endHour) return false;
            }

            return true;
        });
    }

    private calculateRuleCommission(rule: CommissionRule, amount: number, driverData: any): number {
        switch (rule.type) {
            case 'percentage':
                return (amount * rule.value) / 100;

            case 'fixed':
                return rule.value;

            case 'daily':
                // Daily fixed commission regardless of order amount
                return rule.value;

            case 'weekly':
                // Weekly commission - check if this is driver's first order this week
                const isFirstOrderThisWeek = this.isFirstOrderThisWeek(driverData?.id);
                return isFirstOrderThisWeek ? rule.value : 0;

            case 'monthly':
                // Monthly commission - check if this is driver's first order this month
                const isFirstOrderThisMonth = this.isFirstOrderThisMonth(driverData?.id);
                return isFirstOrderThisMonth ? rule.value : 0;

            default:
                return 0;
        }
    }

    private getCalculationDescription(rule: CommissionRule, amount: number, commission: number): string {
        switch (rule.type) {
            case 'percentage':
                return `${rule.value}% dan ${amount.toLocaleString()} = ${commission.toLocaleString()} so'm`;
            case 'fixed':
                return `Belgilangan: ${commission.toLocaleString()} so'm`;
            case 'daily':
                return `Kunlik komissiya: ${commission.toLocaleString()} so'm`;
            case 'weekly':
                return `Haftalik komissiya: ${commission.toLocaleString()} so'm`;
            case 'monthly':
                return `Oylik komissiya: ${commission.toLocaleString()} so'm`;
            default:
                return `${commission.toLocaleString()} so'm`;
        }
    }

    private async getDriverData(driverId: string): Promise<any> {
        try {
            const userDataPath = path.join(process.cwd(), 'user-data.json');
            if (!fs.existsSync(userDataPath)) return null;

            const userData = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
            return userData.drivers?.find(d => d.id.toString() === driverId) || null;
        } catch (error) {
            return null;
        }
    }

    private isFirstOrderThisWeek(driverId: string): boolean {
        // Mock implementation - in real app, check order history
        return Math.random() > 0.5;
    }

    private isFirstOrderThisMonth(driverId: string): boolean {
        // Mock implementation - in real app, check order history
        return Math.random() > 0.7;
    }

    private generateRuleId(): string {
        return 'rule_' + Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
    }

    private getDefaultCommissionRates(): CommissionRates {
        return {
            standard: 15,
            premium: 12,
            rules: [
                {
                    id: 'default_percentage',
                    name: 'Standart Foizli',
                    type: 'percentage',
                    value: 15,
                    description: 'Buyurtma summasidan 15% komissiya',
                    isActive: true,
                    conditions: {
                        driverCategory: 'standard'
                    },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                {
                    id: 'premium_percentage',
                    name: 'Premium Foizli',
                    type: 'percentage',
                    value: 12,
                    description: 'Premium haydovchilar uchun 12% komissiya',
                    isActive: true,
                    conditions: {
                        driverCategory: 'premium'
                    },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                {
                    id: 'vip_percentage',
                    name: 'VIP Foizli',
                    type: 'percentage',
                    value: 8,
                    description: 'VIP haydovchilar uchun 8% komissiya',
                    isActive: true,
                    conditions: {
                        driverCategory: 'vip'
                    },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            ],
            defaultRule: 'default_percentage',
            lastUpdated: new Date().toISOString()
        };
    }
}