import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface CommissionRates {
    standard: number;
    premium: number;
    lastUpdated: string;
}

export interface DriverCommission {
    driverId: string;
    driverName: string;
    totalEarnings: number;
    commissionDeducted: number;
    netAmount: number;
    commissionRate: number;
    orderCount: number;
    lastPayment: string;
}

@Injectable()
export class CommissionService {
    private readonly logger = new Logger(CommissionService.name);
    private readonly ratesFilePath = path.join(process.cwd(), 'commission-rates.json');
    private readonly historyFilePath = path.join(process.cwd(), 'commission-history.json');

    async getCurrentRates(): Promise<CommissionRates> {
        try {
            if (!fs.existsSync(this.ratesFilePath)) {
                const defaultRates: CommissionRates = {
                    standard: 15,
                    premium: 12,
                    lastUpdated: new Date().toISOString()
                };
                await this.saveRates(defaultRates);
                return defaultRates;
            }

            const data = fs.readFileSync(this.ratesFilePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            this.logger.error('Error loading commission rates:', error);
            return { standard: 15, premium: 12, lastUpdated: new Date().toISOString() };
        }
    }

    async updateRates(standard: number, premium: number): Promise<void> {
        try {
            const rates: CommissionRates = {
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
}