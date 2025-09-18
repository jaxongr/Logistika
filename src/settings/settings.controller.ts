import { Controller, Get, Put, Body } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('api/settings')
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) {}

    @Get()
    async getAllSettings() {
        try {
            const settings = await this.settingsService.getAllSettings();
            return {
                success: true,
                data: settings
            };
        } catch (error) {
            return {
                success: false,
                message: 'Sozlamalarni olishda xatolik',
                error: error.message
            };
        }
    }

    @Get('bot')
    async getBotSettings() {
        try {
            const settings = await this.settingsService.getBotSettings();
            return {
                success: true,
                data: settings
            };
        } catch (error) {
            return {
                success: false,
                message: 'Bot sozlamalarini olishda xatolik',
                error: error.message
            };
        }
    }

    @Put('bot')
    async updateBotSettings(@Body() settings: any) {
        try {
            await this.settingsService.updateBotSettings(settings);
            return {
                success: true,
                message: 'Bot sozlamalari yangilandi',
                data: settings
            };
        } catch (error) {
            return {
                success: false,
                message: 'Bot sozlamalarini yangilashda xatolik',
                error: error.message
            };
        }
    }

    @Get('pricing')
    async getPricingSettings() {
        try {
            const settings = await this.settingsService.getPricingSettings();
            return {
                success: true,
                data: settings
            };
        } catch (error) {
            return {
                success: false,
                message: 'Narx sozlamalarini olishda xatolik',
                error: error.message
            };
        }
    }

    @Put('pricing')
    async updatePricingSettings(@Body() settings: any) {
        try {
            await this.settingsService.updatePricingSettings(settings);
            return {
                success: true,
                message: 'Narx sozlamalari yangilandi',
                data: settings
            };
        } catch (error) {
            return {
                success: false,
                message: 'Narx sozlamalarini yangilashda xatolik',
                error: error.message
            };
        }
    }

    @Get('system')
    async getSystemInfo() {
        try {
            const info = await this.settingsService.getSystemInfo();
            return {
                success: true,
                data: info
            };
        } catch (error) {
            return {
                success: false,
                message: 'Tizim ma\'lumotlarini olishda xatolik',
                error: error.message
            };
        }
    }
}