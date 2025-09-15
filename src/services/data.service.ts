import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DataService {
    private readonly dataPath = path.join(__dirname, '../data');
    private cache = new Map<string, any>();
    private cacheTimestamps = new Map<string, number>();
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    constructor() {
        this.ensureDataDirectory();
    }

    private ensureDataDirectory() {
        if (!fs.existsSync(this.dataPath)) {
            fs.mkdirSync(this.dataPath, { recursive: true });
        }
    }

    private getFilePath(filename: string): string {
        return path.join(this.dataPath, `${filename}.json`);
    }

    private isCacheValid(filename: string): boolean {
        const timestamp = this.cacheTimestamps.get(filename);
        if (!timestamp) return false;
        return Date.now() - timestamp < this.CACHE_DURATION;
    }

    async readData<T>(filename: string, defaultData?: T): Promise<T> {
        try {
            // Check cache first
            if (this.cache.has(filename) && this.isCacheValid(filename)) {
                return this.cache.get(filename) as T;
            }

            const filePath = this.getFilePath(filename);

            if (!fs.existsSync(filePath)) {
                if (defaultData) {
                    await this.writeData(filename, defaultData);
                    return defaultData;
                }
                throw new Error(`File ${filename}.json not found`);
            }

            const rawData = await fs.promises.readFile(filePath, 'utf-8');
            const data = JSON.parse(rawData) as T;

            // Update cache
            this.cache.set(filename, data);
            this.cacheTimestamps.set(filename, Date.now());

            return data;
        } catch (error) {
            console.error(`Error reading ${filename}:`, error);
            if (defaultData) {
                return defaultData;
            }
            throw error;
        }
    }

    async writeData<T>(filename: string, data: T): Promise<void> {
        try {
            const filePath = this.getFilePath(filename);
            const jsonData = JSON.stringify(data, null, 2);

            await fs.promises.writeFile(filePath, jsonData, 'utf-8');

            // Update cache
            this.cache.set(filename, data);
            this.cacheTimestamps.set(filename, Date.now());

        } catch (error) {
            console.error(`Error writing ${filename}:`, error);
            throw error;
        }
    }

    async updateData<T>(filename: string, updateFunction: (data: T) => T, defaultData?: T): Promise<T> {
        try {
            const currentData = await this.readData<T>(filename, defaultData);
            const updatedData = updateFunction(currentData);
            await this.writeData(filename, updatedData);
            return updatedData;
        } catch (error) {
            console.error(`Error updating ${filename}:`, error);
            throw error;
        }
    }

    // Specialized methods for system data
    async getUserBalance(userId: string): Promise<number> {
        const balanceData = await this.readData('balance-settings', {
            balanceSettings: { enabled: true },
            userBalances: {},
            balanceHistory: {}
        });
        return balanceData.userBalances[userId] || 0;
    }

    async setUserBalance(userId: string, amount: number): Promise<void> {
        await this.updateData('balance-settings', (data: any) => {
            data.userBalances[userId] = amount;
            data.lastUpdated = new Date().toISOString();
            return data;
        });
    }

    async addBalanceHistory(userId: string, amount: number, type: string, description: string): Promise<void> {
        await this.updateData('balance-settings', (data: any) => {
            if (!data.balanceHistory[userId]) {
                data.balanceHistory[userId] = [];
            }
            data.balanceHistory[userId].push({
                amount,
                type,
                description,
                timestamp: new Date().toISOString(),
                id: Date.now().toString()
            });
            return data;
        });
    }

    async getCommissionSettings(): Promise<any> {
        return await this.readData('commission-settings', {
            commissionSettings: {
                enabled: true,
                perOrderCommission: {
                    enabled: true,
                    type: 'percentage',
                    percentage: 2.0
                }
            }
        });
    }

    async getReferralSystem(): Promise<any> {
        return await this.readData('referral-system', {
            settings: {
                enabled: true,
                driverReferralBonus: 25000,
                customerReferralBonus: 15000,
                dispatcherReferralBonus: 50000
            },
            referrals: {},
            rewards: {},
            statistics: {
                totalReferrals: 0,
                totalRewards: 0,
                activeReferrals: 0
            }
        });
    }

    async getPendingPayments(): Promise<any> {
        return await this.readData('pending-balance-topups', {
            pendingTopUps: {}
        });
    }

    async addPendingPayment(userId: string, amount: number): Promise<string> {
        const paymentId = Date.now().toString();
        await this.updateData('pending-balance-topups', (data: any) => {
            if (!data.pendingTopUps[userId]) {
                data.pendingTopUps[userId] = [];
            }
            data.pendingTopUps[userId].push({
                amount,
                timestamp: new Date().toISOString(),
                status: 'pending_payment_proof',
                id: paymentId
            });
            return data;
        });
        return paymentId;
    }

    async removePendingPayment(userId: string, paymentId: string): Promise<void> {
        await this.updateData('pending-balance-topups', (data: any) => {
            if (data.pendingTopUps[userId]) {
                data.pendingTopUps[userId] = data.pendingTopUps[userId].filter(
                    (payment: any) => payment.id !== paymentId
                );
                if (data.pendingTopUps[userId].length === 0) {
                    delete data.pendingTopUps[userId];
                }
            }
            return data;
        });
    }

    // Cache management
    clearCache(filename?: string): void {
        if (filename) {
            this.cache.delete(filename);
            this.cacheTimestamps.delete(filename);
        } else {
            this.cache.clear();
            this.cacheTimestamps.clear();
        }
    }

    getCacheStats(): { size: number, files: string[] } {
        return {
            size: this.cache.size,
            files: Array.from(this.cache.keys())
        };
    }

    // Backup functionality
    async createBackup(): Promise<string> {
        const backupDir = path.join(this.dataPath, 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(backupDir, `backup-${timestamp}`);

        // Copy all JSON files to backup directory
        const files = fs.readdirSync(this.dataPath).filter(file => file.endsWith('.json'));

        for (const file of files) {
            const sourcePath = path.join(this.dataPath, file);
            const destPath = path.join(backupPath, file);
            await fs.promises.copyFile(sourcePath, destPath);
        }

        return backupPath;
    }

    // Performance monitoring
    async getPerformanceStats(): Promise<any> {
        const files = fs.readdirSync(this.dataPath).filter(file => file.endsWith('.json'));
        const stats = {
            totalFiles: files.length,
            totalSize: 0,
            fileDetails: [] as any[],
            cacheStats: this.getCacheStats()
        };

        for (const file of files) {
            const filePath = path.join(this.dataPath, file);
            const stat = await fs.promises.stat(filePath);
            stats.totalSize += stat.size;
            stats.fileDetails.push({
                name: file,
                size: stat.size,
                modified: stat.mtime,
                cached: this.cache.has(file.replace('.json', ''))
            });
        }

        return stats;
    }
}