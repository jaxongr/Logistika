import { Injectable } from '@nestjs/common';

@Injectable()
export class PerformanceService {
    private metrics = new Map<string, any>();
    private startTimes = new Map<string, number>();
    private memoryBaseline: NodeJS.MemoryUsage;

    constructor() {
        this.memoryBaseline = process.memoryUsage();
        this.startPerformanceMonitoring();
    }

    // Memory monitoring
    getMemoryUsage(): any {
        const usage = process.memoryUsage();
        return {
            rss: this.formatBytes(usage.rss),
            heapTotal: this.formatBytes(usage.heapTotal),
            heapUsed: this.formatBytes(usage.heapUsed),
            external: this.formatBytes(usage.external),
            arrayBuffers: this.formatBytes(usage.arrayBuffers),
            baseline: {
                rss: this.formatBytes(this.memoryBaseline.rss),
                heapTotal: this.formatBytes(this.memoryBaseline.heapTotal),
                heapUsed: this.formatBytes(this.memoryBaseline.heapUsed)
            },
            growth: {
                rss: this.formatBytes(usage.rss - this.memoryBaseline.rss),
                heapTotal: this.formatBytes(usage.heapTotal - this.memoryBaseline.heapTotal),
                heapUsed: this.formatBytes(usage.heapUsed - this.memoryBaseline.heapUsed)
            }
        };
    }

    // Performance timing
    startTimer(operation: string): void {
        this.startTimes.set(operation, Date.now());
    }

    endTimer(operation: string): number {
        const startTime = this.startTimes.get(operation);
        if (!startTime) {
            return 0;
        }

        const duration = Date.now() - startTime;
        this.startTimes.delete(operation);

        // Store metric
        if (!this.metrics.has(operation)) {
            this.metrics.set(operation, {
                totalTime: 0,
                calls: 0,
                averageTime: 0,
                minTime: Infinity,
                maxTime: 0
            });
        }

        const metric = this.metrics.get(operation);
        metric.totalTime += duration;
        metric.calls++;
        metric.averageTime = metric.totalTime / metric.calls;
        metric.minTime = Math.min(metric.minTime, duration);
        metric.maxTime = Math.max(metric.maxTime, duration);

        return duration;
    }

    // Database operation monitoring
    async measureDatabaseOperation<T>(operation: string, fn: () => Promise<T>): Promise<T> {
        this.startTimer(`db_${operation}`);
        try {
            const result = await fn();
            this.endTimer(`db_${operation}`);
            return result;
        } catch (error) {
            this.endTimer(`db_${operation}`);
            throw error;
        }
    }

    // Bot operation monitoring
    measureBotOperation<T>(operation: string, fn: () => T): T {
        this.startTimer(`bot_${operation}`);
        try {
            const result = fn();
            this.endTimer(`bot_${operation}`);
            return result;
        } catch (error) {
            this.endTimer(`bot_${operation}`);
            throw error;
        }
    }

    // System health check
    getSystemHealth(): any {
        const uptime = process.uptime();
        const memory = this.getMemoryUsage();
        const metrics = this.getPerformanceMetrics();

        return {
            status: 'healthy',
            uptime: {
                seconds: uptime,
                formatted: this.formatUptime(uptime)
            },
            memory,
            performance: {
                totalOperations: Array.from(this.metrics.values()).reduce((sum, m) => sum + m.calls, 0),
                averageResponseTime: this.calculateAverageResponseTime(),
                slowestOperations: this.getSlowestOperations(5)
            },
            resourceUsage: {
                cpu: process.cpuUsage(),
                activeHandles: (process as any)._getActiveHandles().length,
                activeRequests: (process as any)._getActiveRequests().length
            }
        };
    }

    // Performance metrics
    getPerformanceMetrics(): any {
        const metrics = {};
        for (const [operation, data] of this.metrics.entries()) {
            metrics[operation] = {
                ...data,
                efficiency: this.calculateEfficiency(data)
            };
        }
        return metrics;
    }

    // Load testing support
    async simulateLoad(operations: number = 1000): Promise<any> {
        const results = {
            totalOperations: operations,
            startTime: Date.now(),
            endTime: 0,
            totalDuration: 0,
            averageTime: 0,
            errors: 0,
            memoryBefore: process.memoryUsage(),
            memoryAfter: null as any,
            memoryDelta: null as any
        };

        console.log(`🚀 Starting load test with ${operations} operations...`);

        const promises = [];
        for (let i = 0; i < operations; i++) {
            promises.push(this.simulateOperation(i));
        }

        try {
            const operationResults = await Promise.all(promises);
            results.errors = operationResults.filter(r => !r.success).length;
        } catch (error) {
            results.errors++;
        }

        results.endTime = Date.now();
        results.totalDuration = results.endTime - results.startTime;
        results.averageTime = results.totalDuration / operations;
        results.memoryAfter = process.memoryUsage();
        results.memoryDelta = {
            rss: results.memoryAfter.rss - results.memoryBefore.rss,
            heapTotal: results.memoryAfter.heapTotal - results.memoryBefore.heapTotal,
            heapUsed: results.memoryAfter.heapUsed - results.memoryBefore.heapUsed
        };

        console.log(`✅ Load test completed: ${operations - results.errors}/${operations} successful`);
        return results;
    }

    private async simulateOperation(index: number): Promise<any> {
        const start = Date.now();
        try {
            // Simulate database read
            await new Promise(resolve => setTimeout(resolve, Math.random() * 5));

            // Simulate processing
            const data = {
                id: index,
                timestamp: new Date().toISOString(),
                processed: true
            };

            // Simulate memory usage
            const temp = new Array(100).fill(data);

            return {
                success: true,
                duration: Date.now() - start,
                data: temp.length
            };
        } catch (error) {
            return {
                success: false,
                duration: Date.now() - start,
                error: error.message
            };
        }
    }

    // Helper methods
    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    }

    private formatUptime(seconds: number): string {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        return `${days}d ${hours}h ${minutes}m ${secs}s`;
    }

    private calculateAverageResponseTime(): number {
        const allMetrics = Array.from(this.metrics.values());
        if (allMetrics.length === 0) return 0;

        const totalAverage = allMetrics.reduce((sum, m) => sum + m.averageTime, 0);
        return totalAverage / allMetrics.length;
    }

    private getSlowestOperations(limit: number): any[] {
        return Array.from(this.metrics.entries())
            .sort(([, a], [, b]) => b.averageTime - a.averageTime)
            .slice(0, limit)
            .map(([name, data]) => ({ name, averageTime: data.averageTime, calls: data.calls }));
    }

    private calculateEfficiency(data: any): string {
        if (data.averageTime < 10) return 'excellent';
        if (data.averageTime < 50) return 'good';
        if (data.averageTime < 100) return 'fair';
        return 'needs_optimization';
    }

    private startPerformanceMonitoring(): void {
        // Monitor memory every 30 seconds
        setInterval(() => {
            const usage = process.memoryUsage();
            if (usage.heapUsed > this.memoryBaseline.heapUsed * 2) {
                console.warn('⚠️ High memory usage detected:', this.formatBytes(usage.heapUsed));
            }
        }, 30000);

        // Cleanup old metrics every hour
        setInterval(() => {
            this.cleanupOldMetrics();
        }, 3600000);
    }

    private cleanupOldMetrics(): void {
        // Keep only metrics from operations that were called recently
        const cutoffTime = Date.now() - 3600000; // 1 hour ago

        for (const [operation, data] of this.metrics.entries()) {
            if (data.calls === 0 || data.totalTime < cutoffTime) {
                this.metrics.delete(operation);
            }
        }
    }

    // Monitoring dashboard data
    getDashboardMetrics(): any {
        return {
            system: this.getSystemHealth(),
            performance: this.getPerformanceMetrics(),
            memory: this.getMemoryUsage(),
            timestamp: new Date().toISOString()
        };
    }

    // Reset metrics
    resetMetrics(): void {
        this.metrics.clear();
        this.startTimes.clear();
        this.memoryBaseline = process.memoryUsage();
    }
}