import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

interface DriverBalance {
    driverId: string;
    driverName: string;
    balance: number;
    totalEarnings: number;
    totalWithdrawn: number;
    pendingWithdrawals: number;
    lastPayment: string;
    accountInfo?: {
        cardNumber?: string;
        bankName?: string;
        accountHolder?: string;
    };
}

interface PaymentHistory {
    id: string;
    driverId: string;
    type: 'payment' | 'withdrawal' | 'commission' | 'order_payment';
    amount: number;
    balance_before: number;
    balance_after: number;
    note?: string;
    timestamp: string;
    status: 'completed' | 'pending' | 'failed';
}

@Injectable()
export class DriverPaymentsService {
    private readonly logger = new Logger(DriverPaymentsService.name);
    private readonly userDataPath = path.join(process.cwd(), 'user-data.json');
    private readonly paymentHistoryPath = path.join(process.cwd(), 'payment-history.json');
    private readonly withdrawalRequestsPath = path.join(process.cwd(), 'withdrawal-requests.json');

    async getAllDriverBalances(): Promise<DriverBalance[]> {
        try {
            const userData = this.loadUserData();
            const drivers = userData.drivers || [];

            const balances: DriverBalance[] = drivers.map(driver => ({
                driverId: driver.id.toString(),
                driverName: driver.name || driver.first_name || 'Noma\'lum haydovchi',
                balance: driver.balance || 0,
                totalEarnings: driver.totalEarnings || driver.balance || 0,
                totalWithdrawn: driver.totalWithdrawn || 0,
                pendingWithdrawals: driver.pendingWithdrawals || 0,
                lastPayment: driver.lastPayment || new Date().toISOString(),
                accountInfo: driver.accountInfo
            }));

            return balances.sort((a, b) => b.balance - a.balance);
        } catch (error) {
            this.logger.error('Error getting driver balances:', error);
            return [];
        }
    }

    async getDriverBalance(driverId: string): Promise<DriverBalance> {
        try {
            const userData = this.loadUserData();
            const driver = userData.drivers?.find(d => d.id.toString() === driverId);

            if (!driver) {
                throw new NotFoundException('Haydovchi topilmadi');
            }

            return {
                driverId: driver.id.toString(),
                driverName: driver.name || driver.first_name || 'Noma\'lum haydovchi',
                balance: driver.balance || 0,
                totalEarnings: driver.totalEarnings || driver.balance || 0,
                totalWithdrawn: driver.totalWithdrawn || 0,
                pendingWithdrawals: driver.pendingWithdrawals || 0,
                lastPayment: driver.lastPayment || new Date().toISOString(),
                accountInfo: driver.accountInfo
            };
        } catch (error) {
            this.logger.error('Error getting driver balance:', error);
            throw error;
        }
    }

    async processPayment(driverId: string, amount: number, note?: string): Promise<PaymentHistory> {
        try {
            if (amount <= 0) {
                throw new BadRequestException('To\'lov summasi 0 dan katta bo\'lishi kerak');
            }

            const userData = this.loadUserData();
            const driverIndex = userData.drivers?.findIndex(d => d.id.toString() === driverId);

            if (driverIndex === -1) {
                throw new NotFoundException('Haydovchi topilmadi');
            }

            const driver = userData.drivers[driverIndex];
            const balanceBefore = driver.balance || 0;
            const balanceAfter = balanceBefore + amount;

            // Update driver balance
            userData.drivers[driverIndex].balance = balanceAfter;
            userData.drivers[driverIndex].totalEarnings = (driver.totalEarnings || 0) + amount;
            userData.drivers[driverIndex].lastPayment = new Date().toISOString();

            this.saveUserData(userData);

            // Create payment history entry
            const paymentEntry: PaymentHistory = {
                id: this.generateId(),
                driverId,
                type: 'payment',
                amount,
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                note: note || 'Admin tomonidan to\'lov',
                timestamp: new Date().toISOString(),
                status: 'completed'
            };

            await this.savePaymentHistory(paymentEntry);

            this.logger.log(`Payment processed: ${amount} to driver ${driverId}`);
            return paymentEntry;
        } catch (error) {
            this.logger.error('Error processing payment:', error);
            throw error;
        }
    }

    async getPaymentHistory(driverId: string, limit = 50): Promise<PaymentHistory[]> {
        try {
            const history = this.loadPaymentHistory();
            return history
                .filter(entry => entry.driverId === driverId)
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, limit);
        } catch (error) {
            this.logger.error('Error getting payment history:', error);
            return [];
        }
    }

    async withdrawMoney(driverId: string, amount: number, method: string, account?: string): Promise<any> {
        try {
            const driverBalance = await this.getDriverBalance(driverId);

            if (amount <= 0) {
                throw new BadRequestException('Yechish summasi 0 dan katta bo\'lishi kerak');
            }

            if (amount > driverBalance.balance) {
                throw new BadRequestException('Balansda yetarli mablag\' yo\'q');
            }

            // Create withdrawal request
            const withdrawalRequest = {
                id: this.generateId(),
                driverId,
                driverName: driverBalance.driverName,
                amount,
                method, // 'card', 'bank', 'cash'
                account,
                status: 'pending',
                createdAt: new Date().toISOString(),
                processedAt: null
            };

            await this.saveWithdrawalRequest(withdrawalRequest);

            // Update pending withdrawals
            const userData = this.loadUserData();
            const driverIndex = userData.drivers?.findIndex(d => d.id.toString() === driverId);
            if (driverIndex !== -1) {
                userData.drivers[driverIndex].pendingWithdrawals =
                    (userData.drivers[driverIndex].pendingWithdrawals || 0) + amount;
                this.saveUserData(userData);
            }

            this.logger.log(`Withdrawal request created: ${amount} for driver ${driverId}`);
            return withdrawalRequest;
        } catch (error) {
            this.logger.error('Error processing withdrawal:', error);
            throw error;
        }
    }

    async getPaymentStatistics(): Promise<any> {
        try {
            const drivers = await this.getAllDriverBalances();
            const history = this.loadPaymentHistory();

            const totalBalance = drivers.reduce((sum, driver) => sum + driver.balance, 0);
            const totalEarnings = drivers.reduce((sum, driver) => sum + driver.totalEarnings, 0);
            const totalWithdrawn = drivers.reduce((sum, driver) => sum + driver.totalWithdrawn, 0);
            const pendingWithdrawals = drivers.reduce((sum, driver) => sum + driver.pendingWithdrawals, 0);

            // Recent payments (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const recentPayments = history.filter(entry =>
                new Date(entry.timestamp) >= thirtyDaysAgo && entry.type === 'payment'
            );

            const monthlyPayments = recentPayments.reduce((sum, payment) => sum + payment.amount, 0);

            return {
                totalDrivers: drivers.length,
                totalBalance,
                totalEarnings,
                totalWithdrawn,
                pendingWithdrawals,
                monthlyPayments,
                averageBalance: drivers.length > 0 ? totalBalance / drivers.length : 0,
                topEarners: drivers.slice(0, 10),
                recentPaymentsCount: recentPayments.length
            };
        } catch (error) {
            this.logger.error('Error getting payment statistics:', error);
            throw error;
        }
    }

    async processBulkPayment(payments: Array<{ driverId: string; amount: number; note?: string }>): Promise<any[]> {
        try {
            const results = [];

            for (const payment of payments) {
                try {
                    const result = await this.processPayment(payment.driverId, payment.amount, payment.note);
                    results.push({ driverId: payment.driverId, success: true, result });
                } catch (error) {
                    results.push({ driverId: payment.driverId, success: false, error: error.message });
                }
            }

            this.logger.log(`Bulk payment processed: ${payments.length} payments`);
            return results;
        } catch (error) {
            this.logger.error('Error processing bulk payment:', error);
            throw error;
        }
    }

    private loadUserData(): any {
        try {
            if (!fs.existsSync(this.userDataPath)) {
                return { drivers: [] };
            }
            const data = fs.readFileSync(this.userDataPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            this.logger.error('Error loading user data:', error);
            return { drivers: [] };
        }
    }

    private saveUserData(data: any): void {
        fs.writeFileSync(this.userDataPath, JSON.stringify(data, null, 2));
    }

    private loadPaymentHistory(): PaymentHistory[] {
        try {
            if (!fs.existsSync(this.paymentHistoryPath)) {
                return [];
            }
            const data = fs.readFileSync(this.paymentHistoryPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            this.logger.error('Error loading payment history:', error);
            return [];
        }
    }

    private async savePaymentHistory(entry: PaymentHistory): Promise<void> {
        try {
            const history = this.loadPaymentHistory();
            history.push(entry);

            // Keep only last 5000 entries
            if (history.length > 5000) {
                history.splice(0, history.length - 5000);
            }

            fs.writeFileSync(this.paymentHistoryPath, JSON.stringify(history, null, 2));
        } catch (error) {
            this.logger.error('Error saving payment history:', error);
        }
    }

    private async saveWithdrawalRequest(request: any): Promise<void> {
        try {
            let requests = [];
            if (fs.existsSync(this.withdrawalRequestsPath)) {
                const data = fs.readFileSync(this.withdrawalRequestsPath, 'utf8');
                requests = JSON.parse(data);
            }

            requests.push(request);
            fs.writeFileSync(this.withdrawalRequestsPath, JSON.stringify(requests, null, 2));
        } catch (error) {
            this.logger.error('Error saving withdrawal request:', error);
        }
    }

    private generateId(): string {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }
}