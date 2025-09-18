import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface FinanceData {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    orderRevenue: number;
    commissionRevenue: number;
    expensesByCategory: { [category: string]: number };
    revenueGrowth: number;
    profitMargin: number;
}

export interface Expense {
    id: string;
    amount: number;
    category: string;
    description: string;
    date: string;
    createdAt: string;
}

export interface RevenueData {
    date: string;
    orderRevenue: number;
    commissionRevenue: number;
    totalRevenue: number;
}

@Injectable()
export class FinanceService {
    private readonly logger = new Logger(FinanceService.name);
    private readonly expensesFilePath = path.join(process.cwd(), 'finance-expenses.json');
    private readonly revenueFilePath = path.join(process.cwd(), 'finance-revenue.json');

    async getFinanceDashboard(period: string): Promise<FinanceData> {
        try {
            const revenue = await this.calculateRevenue(period);
            const expenses = await this.calculateExpenses(period);
            const previousPeriodRevenue = await this.calculateRevenue(this.getPreviousPeriod(period));

            const totalRevenue = revenue.orderRevenue + revenue.commissionRevenue;
            const totalExpenses = expenses.total;
            const netProfit = totalRevenue - totalExpenses;
            const revenueGrowth = previousPeriodRevenue.total > 0
                ? ((totalRevenue - previousPeriodRevenue.total) / previousPeriodRevenue.total) * 100
                : 0;
            const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

            return {
                totalRevenue,
                totalExpenses,
                netProfit,
                orderRevenue: revenue.orderRevenue,
                commissionRevenue: revenue.commissionRevenue,
                expensesByCategory: expenses.byCategory,
                revenueGrowth,
                profitMargin
            };
        } catch (error) {
            this.logger.error('Error getting finance dashboard:', error);
            throw error;
        }
    }

    async getRevenue(period: string, startDate?: string, endDate?: string): Promise<any> {
        try {
            if (startDate && endDate) {
                return this.calculateRevenueByDateRange(startDate, endDate);
            }
            return this.calculateRevenue(period);
        } catch (error) {
            this.logger.error('Error getting revenue:', error);
            throw error;
        }
    }

    async getExpenses(period: string, category?: string): Promise<any> {
        try {
            const expenses = await this.calculateExpenses(period);

            if (category) {
                return {
                    category,
                    amount: expenses.byCategory[category] || 0,
                    percentage: expenses.total > 0 ? ((expenses.byCategory[category] || 0) / expenses.total) * 100 : 0
                };
            }

            return expenses;
        } catch (error) {
            this.logger.error('Error getting expenses:', error);
            throw error;
        }
    }

    async addExpense(expenseData: {
        amount: number;
        category: string;
        description: string;
        date?: string;
    }): Promise<Expense> {
        try {
            const expense: Expense = {
                id: this.generateId(),
                amount: expenseData.amount,
                category: expenseData.category,
                description: expenseData.description,
                date: expenseData.date || new Date().toISOString().split('T')[0],
                createdAt: new Date().toISOString()
            };

            await this.saveExpense(expense);
            this.logger.log(`Expense added: ${expense.category} - ${expense.amount} so'm`);

            return expense;
        } catch (error) {
            this.logger.error('Error adding expense:', error);
            throw error;
        }
    }

    async getProfit(period: string): Promise<any> {
        try {
            const revenue = await this.calculateRevenue(period);
            const expenses = await this.calculateExpenses(period);

            const totalRevenue = revenue.orderRevenue + revenue.commissionRevenue;
            const netProfit = totalRevenue - expenses.total;
            const previousPeriodRevenue = await this.calculateRevenue(this.getPreviousPeriod(period));
            const previousPeriodExpenses = await this.calculateExpenses(this.getPreviousPeriod(period));
            const previousNetProfit = (previousPeriodRevenue.orderRevenue + previousPeriodRevenue.commissionRevenue) - previousPeriodExpenses.total;

            const profitGrowth = previousNetProfit > 0 ? ((netProfit - previousNetProfit) / previousNetProfit) * 100 : 0;

            return {
                netProfit,
                grossProfit: totalRevenue,
                profitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
                profitGrowth,
                breakdown: {
                    revenue: {
                        orders: revenue.orderRevenue,
                        commission: revenue.commissionRevenue,
                        total: totalRevenue
                    },
                    expenses: expenses.byCategory,
                    totalExpenses: expenses.total
                }
            };
        } catch (error) {
            this.logger.error('Error getting profit:', error);
            throw error;
        }
    }

    async getDailyReport(date?: string): Promise<any> {
        try {
            const targetDate = date || new Date().toISOString().split('T')[0];

            // Get orders for this date
            const orders = await this.getOrdersData();
            const dailyOrders = orders.filter(order => order.date === targetDate);

            const orderRevenue = dailyOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
            const commissionRevenue = orderRevenue * 0.15; // Assume 15% commission

            // Get expenses for this date
            const expenses = await this.getExpensesData();
            const dailyExpenses = expenses.filter(expense => expense.date === targetDate);
            const totalExpenses = dailyExpenses.reduce((sum, expense) => sum + expense.amount, 0);

            return {
                date: targetDate,
                revenue: {
                    orders: orderRevenue,
                    commission: commissionRevenue,
                    total: orderRevenue + commissionRevenue
                },
                expenses: {
                    total: totalExpenses,
                    items: dailyExpenses
                },
                profit: (orderRevenue + commissionRevenue) - totalExpenses,
                orderCount: dailyOrders.length
            };
        } catch (error) {
            this.logger.error('Error getting daily report:', error);
            throw error;
        }
    }

    async getMonthlyReport(year?: number, month?: number): Promise<any> {
        try {
            const targetYear = year || new Date().getFullYear();
            const targetMonth = month || new Date().getMonth() + 1;

            const startDate = `${targetYear}-${targetMonth.toString().padStart(2, '0')}-01`;
            const endDate = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0];

            return this.calculateRevenueByDateRange(startDate, endDate);
        } catch (error) {
            this.logger.error('Error getting monthly report:', error);
            throw error;
        }
    }

    async getRevenueTrend(period: string): Promise<RevenueData[]> {
        try {
            const months = period === '6months' ? 6 : 12;
            const trend: RevenueData[] = [];

            for (let i = months - 1; i >= 0; i--) {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const monthStr = date.toISOString().slice(0, 7); // YYYY-MM

                const revenue = await this.calculateRevenueForMonth(monthStr);

                trend.push({
                    date: monthStr,
                    orderRevenue: revenue.orderRevenue,
                    commissionRevenue: revenue.commissionRevenue,
                    totalRevenue: revenue.orderRevenue + revenue.commissionRevenue
                });
            }

            return trend;
        } catch (error) {
            this.logger.error('Error getting revenue trend:', error);
            return [];
        }
    }

    async getFinanceStatistics(): Promise<any> {
        try {
            const currentMonth = await this.calculateRevenue('monthly');
            const previousMonth = await this.calculateRevenue(this.getPreviousPeriod('monthly'));
            const currentYear = await this.calculateRevenue('yearly');

            const totalRevenue = currentMonth.orderRevenue + currentMonth.commissionRevenue;
            const previousTotalRevenue = previousMonth.orderRevenue + previousMonth.commissionRevenue;
            const yearlyRevenue = currentYear.orderRevenue + currentYear.commissionRevenue;

            const monthlyGrowth = previousTotalRevenue > 0
                ? ((totalRevenue - previousTotalRevenue) / previousTotalRevenue) * 100
                : 0;

            return {
                currentMonth: {
                    revenue: totalRevenue,
                    growth: monthlyGrowth
                },
                currentYear: {
                    revenue: yearlyRevenue
                },
                averageOrderValue: currentMonth.orderRevenue > 0 ? currentMonth.orderRevenue / (await this.getOrderCount('monthly')) : 0,
                topExpenseCategories: await this.getTopExpenseCategories(),
                profitMargin: totalRevenue > 0 ? ((totalRevenue - (await this.calculateExpenses('monthly')).total) / totalRevenue) * 100 : 0
            };
        } catch (error) {
            this.logger.error('Error getting finance statistics:', error);
            throw error;
        }
    }

    private async calculateRevenue(period: string): Promise<{ orderRevenue: number; commissionRevenue: number; total: number }> {
        const orders = await this.getOrdersData();
        const periodOrders = this.filterOrdersByPeriod(orders, period);

        const orderRevenue = periodOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
        const commissionRevenue = orderRevenue * 0.15; // Default 15% commission

        return {
            orderRevenue,
            commissionRevenue,
            total: orderRevenue + commissionRevenue
        };
    }

    private async calculateExpenses(period: string): Promise<{ total: number; byCategory: { [key: string]: number } }> {
        const expenses = await this.getExpensesData();
        const periodExpenses = this.filterExpensesByPeriod(expenses, period);

        const total = periodExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        const byCategory: { [key: string]: number } = {};

        periodExpenses.forEach(expense => {
            byCategory[expense.category] = (byCategory[expense.category] || 0) + expense.amount;
        });

        return { total, byCategory };
    }

    private async calculateRevenueByDateRange(startDate: string, endDate: string): Promise<any> {
        const orders = await this.getOrdersData();
        const rangeOrders = orders.filter(order =>
            order.date >= startDate && order.date <= endDate
        );

        const orderRevenue = rangeOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
        const commissionRevenue = orderRevenue * 0.15;

        return {
            startDate,
            endDate,
            orderRevenue,
            commissionRevenue,
            totalRevenue: orderRevenue + commissionRevenue,
            orderCount: rangeOrders.length
        };
    }

    private async calculateRevenueForMonth(monthStr: string): Promise<{ orderRevenue: number; commissionRevenue: number }> {
        const orders = await this.getOrdersData();
        const monthOrders = orders.filter(order => order.date?.startsWith(monthStr));

        const orderRevenue = monthOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
        const commissionRevenue = orderRevenue * 0.15;

        return { orderRevenue, commissionRevenue };
    }

    private filterOrdersByPeriod(orders: any[], period: string): any[] {
        const now = new Date();
        let cutoffDate: Date;

        switch (period) {
            case 'daily':
                cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'weekly':
                cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'monthly':
                cutoffDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'yearly':
                cutoffDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                cutoffDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        return orders.filter(order => {
            const orderDate = new Date(order.date || order.dateTime);
            return orderDate >= cutoffDate;
        });
    }

    private filterExpensesByPeriod(expenses: Expense[], period: string): Expense[] {
        const now = new Date();
        let cutoffDate: Date;

        switch (period) {
            case 'daily':
                cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'weekly':
                cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'monthly':
                cutoffDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'yearly':
                cutoffDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                cutoffDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        return expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate >= cutoffDate;
        });
    }

    private getPreviousPeriod(period: string): string {
        // Return the same period type for previous calculation
        return period;
    }

    private async getOrdersData(): Promise<any[]> {
        try {
            // Load from order history and active orders
            const historyPath = path.join(process.cwd(), 'order-history.json');
            let orders = [];

            if (fs.existsSync(historyPath)) {
                const historyData = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
                orders = historyData.orders || [];
            }

            return orders;
        } catch (error) {
            return [];
        }
    }

    private async getExpensesData(): Promise<Expense[]> {
        try {
            if (!fs.existsSync(this.expensesFilePath)) {
                return [];
            }
            const data = fs.readFileSync(this.expensesFilePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return [];
        }
    }

    private async saveExpense(expense: Expense): Promise<void> {
        try {
            const expenses = await this.getExpensesData();
            expenses.push(expense);

            // Keep only last 1000 expenses
            if (expenses.length > 1000) {
                expenses.splice(0, expenses.length - 1000);
            }

            fs.writeFileSync(this.expensesFilePath, JSON.stringify(expenses, null, 2));
        } catch (error) {
            this.logger.error('Error saving expense:', error);
            throw error;
        }
    }

    private async getOrderCount(period: string): Promise<number> {
        const orders = await this.getOrdersData();
        return this.filterOrdersByPeriod(orders, period).length;
    }

    private async getTopExpenseCategories(): Promise<Array<{ category: string; amount: number; percentage: number }>> {
        const expenses = await this.calculateExpenses('monthly');
        const categories = Object.entries(expenses.byCategory)
            .map(([category, amount]) => ({
                category,
                amount,
                percentage: expenses.total > 0 ? (amount / expenses.total) * 100 : 0
            }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);

        return categories;
    }

    private generateId(): string {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }
}