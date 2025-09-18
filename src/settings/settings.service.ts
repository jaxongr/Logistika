import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SettingsService {
    private readonly logger = new Logger(SettingsService.name);
    private readonly settingsPath = path.join(process.cwd(), 'system-settings.json');

    async getAllSettings(): Promise<any> {
        try {
            const settings = this.loadSettings();
            return {
                bot: settings.bot || {},
                pricing: settings.pricing || {},
                system: await this.getSystemInfo(),
                commission: settings.commission || { standard: 15, premium: 12 }
            };
        } catch (error) {
            this.logger.error('Error getting all settings:', error);
            return this.getDefaultSettings();
        }
    }

    async getBotSettings(): Promise<any> {
        try {
            const settings = this.loadSettings();
            return settings.bot || {
                botName: '@yoldauz_yukbot',
                autoResponse: true,
                welcomeMessage: 'Assalomu alaykum! Yuk tashish xizmatiga xush kelibsiz.',
                workingHours: {
                    start: '09:00',
                    end: '18:00',
                    timezone: 'Asia/Tashkent'
                },
                notificationSettings: {
                    newOrders: true,
                    paymentConfirmations: true,
                    driverUpdates: true
                }
            };
        } catch (error) {
            this.logger.error('Error getting bot settings:', error);
            throw error;
        }
    }

    async updateBotSettings(newSettings: any): Promise<void> {
        try {
            const settings = this.loadSettings();
            settings.bot = { ...settings.bot, ...newSettings };
            settings.lastUpdated = new Date().toISOString();
            this.saveSettings(settings);
            this.logger.log('Bot settings updated');
        } catch (error) {
            this.logger.error('Error updating bot settings:', error);
            throw error;
        }
    }

    async getPricingSettings(): Promise<any> {
        try {
            const settings = this.loadSettings();
            return settings.pricing || {
                minimumRate: 2000, // so'm per km
                baseRate: 2500,
                nightSurcharge: 20, // %
                weekendSurcharge: 15, // %
                longDistanceSurcharge: 10, // %
                fuelSurcharge: 5, // %
                additionalServiceRate: 10, // %
                currency: 'UZS'
            };
        } catch (error) {
            this.logger.error('Error getting pricing settings:', error);
            throw error;
        }
    }

    async updatePricingSettings(newSettings: any): Promise<void> {
        try {
            const settings = this.loadSettings();
            settings.pricing = { ...settings.pricing, ...newSettings };
            settings.lastUpdated = new Date().toISOString();
            this.saveSettings(settings);
            this.logger.log('Pricing settings updated');
        } catch (error) {
            this.logger.error('Error updating pricing settings:', error);
            throw error;
        }
    }

    async getSystemInfo(): Promise<any> {
        try {
            const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
            const uptime = process.uptime();
            const memoryUsage = process.memoryUsage();

            return {
                version: 'v2.0.0 Enterprise',
                nodeVersion: process.version,
                platform: process.platform,
                uptime: Math.floor(uptime),
                uptimeFormatted: this.formatUptime(uptime),
                memoryUsage: {
                    rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
                    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
                    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB'
                },
                lastRestart: this.getLastRestartTime(),
                environment: process.env.NODE_ENV || 'development'
            };
        } catch (error) {
            this.logger.error('Error getting system info:', error);
            return {
                version: 'v2.0.0 Enterprise',
                status: 'unknown',
                lastUpdated: new Date().toLocaleDateString()
            };
        }
    }

    private loadSettings(): any {
        try {
            if (!fs.existsSync(this.settingsPath)) {
                const defaultSettings = this.getDefaultSettings();
                this.saveSettings(defaultSettings);
                return defaultSettings;
            }
            const data = fs.readFileSync(this.settingsPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            this.logger.error('Error loading settings:', error);
            return this.getDefaultSettings();
        }
    }

    private saveSettings(settings: any): void {
        try {
            fs.writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2));
        } catch (error) {
            this.logger.error('Error saving settings:', error);
            throw error;
        }
    }

    private getDefaultSettings(): any {
        return {
            bot: {
                botName: '@yoldauz_yukbot',
                autoResponse: true,
                welcomeMessage: 'Assalomu alaykum! Yuk tashish xizmatiga xush kelibsiz.',
                workingHours: {
                    start: '09:00',
                    end: '18:00',
                    timezone: 'Asia/Tashkent'
                },
                notificationSettings: {
                    newOrders: true,
                    paymentConfirmations: true,
                    driverUpdates: true
                }
            },
            pricing: {
                minimumRate: 2000,
                baseRate: 2500,
                nightSurcharge: 20,
                weekendSurcharge: 15,
                longDistanceSurcharge: 10,
                fuelSurcharge: 5,
                additionalServiceRate: 10,
                currency: 'UZS'
            },
            commission: {
                standard: 15,
                premium: 12
            },
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };
    }

    private formatUptime(uptime: number): string {
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);

        if (days > 0) {
            return `${days} kun, ${hours} soat, ${minutes} daqiqa`;
        } else if (hours > 0) {
            return `${hours} soat, ${minutes} daqiqa`;
        } else {
            return `${minutes} daqiqa`;
        }
    }

    private getLastRestartTime(): string {
        const startTime = new Date(Date.now() - process.uptime() * 1000);
        return startTime.toLocaleString('uz-UZ');
    }
}