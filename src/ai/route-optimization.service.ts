import { Injectable, Logger } from '@nestjs/common';
import { OpenAIService } from './openai.service';
import * as fs from 'fs';
import * as path from 'path';

export interface RouteOptimizationRequest {
  orderId: string;
  fromCity: string;
  toCity: string;
  cargoType: string;
  weight: number;
  urgency: 'normal' | 'urgent' | 'express';
  vehicleType?: string;
  weatherConditions?: string;
  trafficData?: any;
}

export interface OptimizedRoute {
  orderId: string;
  originalRoute: string[];
  optimizedRoute: string[];
  estimatedTime: number;
  estimatedFuelCost: number;
  distanceKm: number;
  riskFactors: string[];
  alternatives: Array<{
    route: string[];
    time: number;
    cost: number;
    pros: string[];
    cons: string[];
  }>;
  recommendations: string[];
  confidenceScore: number;
  createdAt: string;
}

@Injectable()
export class RouteOptimizationService {
  private readonly logger = new Logger(RouteOptimizationService.name);
  private readonly routeHistoryPath = path.join(process.cwd(), 'route-optimization-history.json');
  private readonly routeCachePath = path.join(process.cwd(), 'route-cache.json');

  constructor(private readonly openaiService: OpenAIService) {}

  async optimizeRoute(request: RouteOptimizationRequest): Promise<OptimizedRoute> {
    try {
      this.logger.log(`🗺️ Optimizing route: ${request.fromCity} → ${request.toCity}`);

      // Check cache first
      const cachedRoute = await this.getCachedRoute(request);
      if (cachedRoute) {
        this.logger.log(`⚡ Using cached route optimization`);
        return cachedRoute;
      }

      // Gather route data
      const routeData = {
        from: request.fromCity,
        to: request.toCity,
        distance: this.calculateDistance(request.fromCity, request.toCity),
        cargoType: request.cargoType,
        vehicleType: request.vehicleType || 'truck',
        trafficConditions: await this.getCurrentTrafficConditions(request.fromCity, request.toCity),
        weather: request.weatherConditions || await this.getCurrentWeather(request.fromCity)
      };

      // Use AI for optimization
      const aiOptimization = await this.openaiService.optimizeRoute(routeData);

      // Enhance with local knowledge
      const optimizedRoute: OptimizedRoute = {
        orderId: request.orderId,
        originalRoute: [request.fromCity, request.toCity],
        optimizedRoute: aiOptimization.optimizedRoute || [request.fromCity, request.toCity],
        estimatedTime: aiOptimization.estimatedTime || this.calculateEstimatedTime(routeData.distance),
        estimatedFuelCost: aiOptimization.fuelCost || this.calculateFuelCost(routeData.distance),
        distanceKm: routeData.distance,
        riskFactors: aiOptimization.riskFactors || this.identifyRiskFactors(routeData),
        alternatives: aiOptimization.alternatives || await this.generateAlternatives(request),
        recommendations: aiOptimization.recommendations || this.generateRecommendations(routeData),
        confidenceScore: this.calculateConfidenceScore(aiOptimization),
        createdAt: new Date().toISOString()
      };

      // Cache the result
      await this.cacheRoute(request, optimizedRoute);

      // Save to history
      await this.saveToHistory(optimizedRoute);

      this.logger.log(`✅ Route optimized: ${optimizedRoute.estimatedTime}min, ${optimizedRoute.estimatedFuelCost} UZS`);
      return optimizedRoute;

    } catch (error) {
      this.logger.error('Route optimization error:', error);
      return this.getFallbackOptimization(request);
    }
  }

  async batchOptimizeRoutes(requests: RouteOptimizationRequest[]): Promise<OptimizedRoute[]> {
    this.logger.log(`🔄 Batch optimizing ${requests.length} routes`);

    const results = await Promise.all(
      requests.map(request => this.optimizeRoute(request))
    );

    // Analyze patterns across routes
    const patterns = this.analyzeRoutePatterns(results);
    this.logger.log(`📊 Route patterns analyzed: ${JSON.stringify(patterns)}`);

    return results;
  }

  async getRouteHistory(driverId?: number, limit = 50): Promise<OptimizedRoute[]> {
    try {
      const history = await this.loadRouteHistory();
      let filtered = history;

      if (driverId) {
        // Filter by driver if needed (would need driver tracking in routes)
        // For now, return all routes
      }

      return filtered
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);

    } catch (error) {
      this.logger.error('Error loading route history:', error);
      return [];
    }
  }

  async getRouteAnalytics(period: string): Promise<any> {
    try {
      const history = await this.getRouteHistory();
      const startDate = this.getPeriodStartDate(period);

      const periodRoutes = history.filter(route =>
        new Date(route.createdAt) >= startDate
      );

      const analytics = {
        totalRoutes: periodRoutes.length,
        averageDistance: this.calculateAverage(periodRoutes, 'distanceKm'),
        averageTime: this.calculateAverage(periodRoutes, 'estimatedTime'),
        averageFuelCost: this.calculateAverage(periodRoutes, 'estimatedFuelCost'),
        averageConfidence: this.calculateAverage(periodRoutes, 'confidenceScore'),
        mostCommonRoutes: this.getMostCommonRoutes(periodRoutes),
        riskAnalysis: this.analyzeRisks(periodRoutes),
        fuelOptimization: this.analyzeFuelOptimization(periodRoutes),
        timeOptimization: this.analyzeTimeOptimization(periodRoutes)
      };

      return analytics;

    } catch (error) {
      this.logger.error('Error calculating route analytics:', error);
      throw error;
    }
  }

  private async getCachedRoute(request: RouteOptimizationRequest): Promise<OptimizedRoute | null> {
    try {
      const cache = await this.loadRouteCache();
      const cacheKey = this.generateCacheKey(request);
      const cached = cache[cacheKey];

      if (cached && this.isCacheValid(cached)) {
        return cached.route;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private async cacheRoute(request: RouteOptimizationRequest, route: OptimizedRoute): Promise<void> {
    try {
      const cache = await this.loadRouteCache();
      const cacheKey = this.generateCacheKey(request);

      cache[cacheKey] = {
        route,
        cachedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours
      };

      await this.saveRouteCache(cache);
    } catch (error) {
      this.logger.warn('Failed to cache route:', error);
    }
  }

  private calculateDistance(fromCity: string, toCity: string): number {
    const distances: { [key: string]: number } = {
      'Toshkent-Samarqand': 280,
      'Toshkent-Buxoro': 440,
      'Toshkent-Andijon': 320,
      'Toshkent-Fargona': 300,
      'Toshkent-Namangan': 310,
      'Toshkent-Qashqadaryo': 380,
      'Toshkent-Surxondaryo': 420,
      'Toshkent-Sirdaryo': 120,
      'Toshkent-Jizzax': 180,
      'Toshkent-Navoiy': 340,
      'Toshkent-Xorazm': 480,
      'Toshkent-Qoraqalpogiston': 520,
      'Samarqand-Buxoro': 160,
      'Samarqand-Qashqadaryo': 180,
      'Buxoro-Navoiy': 100,
      'Buxoro-Xorazm': 200,
      'Andijon-Fargona': 40,
      'Andijon-Namangan': 60,
      'Fargona-Namangan': 70
    };

    const key = `${fromCity}-${toCity}`;
    const reverseKey = `${toCity}-${fromCity}`;

    return distances[key] || distances[reverseKey] || 200;
  }

  private calculateEstimatedTime(distance: number): number {
    // Average speed 60 km/h on highways, 40 km/h in cities
    const averageSpeed = 50;
    return Math.round((distance / averageSpeed) * 60); // minutes
  }

  private calculateFuelCost(distance: number): number {
    // Current fuel prices in Uzbekistan: ~8000 UZS/liter
    // Average consumption: 25L/100km for trucks
    const fuelPricePer100km = 25 * 8000; // 200,000 UZS per 100km
    return Math.round((distance / 100) * fuelPricePer100km);
  }

  private async getCurrentTrafficConditions(fromCity: string, toCity: string): Promise<string> {
    // In production, integrate with traffic APIs
    const hour = new Date().getHours();

    if (hour >= 7 && hour <= 9 || hour >= 17 && hour <= 19) {
      return 'heavy'; // Rush hours
    } else if (hour >= 10 && hour <= 16) {
      return 'moderate';
    } else {
      return 'light';
    }
  }

  private async getCurrentWeather(city: string): Promise<string> {
    // In production, integrate with weather APIs
    const conditions = ['clear', 'cloudy', 'rain', 'snow', 'fog'];
    return conditions[Math.floor(Math.random() * conditions.length)];
  }

  private identifyRiskFactors(routeData: any): string[] {
    const risks: string[] = [];

    if (routeData.weather === 'rain' || routeData.weather === 'snow') {
      risks.push('adverse_weather');
    }

    if (routeData.trafficConditions === 'heavy') {
      risks.push('heavy_traffic');
    }

    if (routeData.distance > 400) {
      risks.push('long_distance');
    }

    const mountainousRoutes = ['Toshkent-Qashqadaryo', 'Samarqand-Qashqadaryo'];
    const routeKey = `${routeData.from}-${routeData.to}`;
    if (mountainousRoutes.includes(routeKey)) {
      risks.push('mountainous_terrain');
    }

    return risks;
  }

  private async generateAlternatives(request: RouteOptimizationRequest): Promise<any[]> {
    // Generate alternative routes based on priorities
    const alternatives = [];

    // Fastest route
    alternatives.push({
      route: [request.fromCity, request.toCity],
      time: this.calculateEstimatedTime(this.calculateDistance(request.fromCity, request.toCity)) * 0.9,
      cost: this.calculateFuelCost(this.calculateDistance(request.fromCity, request.toCity)) * 1.1,
      pros: ['Fastest arrival', 'Direct route'],
      cons: ['Higher fuel cost', 'More traffic']
    });

    // Most economical route
    alternatives.push({
      route: [request.fromCity, request.toCity],
      time: this.calculateEstimatedTime(this.calculateDistance(request.fromCity, request.toCity)) * 1.1,
      cost: this.calculateFuelCost(this.calculateDistance(request.fromCity, request.toCity)) * 0.8,
      pros: ['Lower fuel cost', 'Scenic route'],
      cons: ['Longer travel time', 'Secondary roads']
    });

    return alternatives;
  }

  private generateRecommendations(routeData: any): string[] {
    const recommendations: string[] = [];

    if (routeData.trafficConditions === 'heavy') {
      recommendations.push('Consider departing 2 hours earlier to avoid traffic');
    }

    if (routeData.weather === 'rain' || routeData.weather === 'snow') {
      recommendations.push('Check tire condition and carry emergency kit');
    }

    if (routeData.distance > 300) {
      recommendations.push('Plan fuel stops and driver rest breaks');
    }

    recommendations.push('Monitor real-time traffic updates during journey');
    recommendations.push('Maintain vehicle speed at 80-90 km/h for optimal fuel efficiency');

    return recommendations;
  }

  private calculateConfidenceScore(aiOptimization: any): number {
    // Calculate confidence based on data quality and AI response
    let score = 75; // Base score

    if (aiOptimization && aiOptimization.optimizedRoute) {
      score += 15; // AI provided route
    }

    if (aiOptimization && aiOptimization.riskFactors) {
      score += 10; // Risk analysis available
    }

    return Math.min(100, score);
  }

  private getFallbackOptimization(request: RouteOptimizationRequest): OptimizedRoute {
    const distance = this.calculateDistance(request.fromCity, request.toCity);

    return {
      orderId: request.orderId,
      originalRoute: [request.fromCity, request.toCity],
      optimizedRoute: [request.fromCity, request.toCity],
      estimatedTime: this.calculateEstimatedTime(distance),
      estimatedFuelCost: this.calculateFuelCost(distance),
      distanceKm: distance,
      riskFactors: ['weather_unknown', 'traffic_unknown'],
      alternatives: [],
      recommendations: ['Follow main highway route', 'Monitor traffic conditions'],
      confidenceScore: 60,
      createdAt: new Date().toISOString()
    };
  }

  private generateCacheKey(request: RouteOptimizationRequest): string {
    return `${request.fromCity}-${request.toCity}-${request.cargoType}-${request.urgency}`;
  }

  private isCacheValid(cached: any): boolean {
    return new Date(cached.expiresAt) > new Date();
  }

  private async loadRouteHistory(): Promise<OptimizedRoute[]> {
    try {
      if (!fs.existsSync(this.routeHistoryPath)) {
        return [];
      }
      const data = fs.readFileSync(this.routeHistoryPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  private async saveToHistory(route: OptimizedRoute): Promise<void> {
    try {
      const history = await this.loadRouteHistory();
      history.push(route);

      // Keep only last 1000 routes
      if (history.length > 1000) {
        history.splice(0, history.length - 1000);
      }

      fs.writeFileSync(this.routeHistoryPath, JSON.stringify(history, null, 2));
    } catch (error) {
      this.logger.error('Failed to save route to history:', error);
    }
  }

  private async loadRouteCache(): Promise<any> {
    try {
      if (!fs.existsSync(this.routeCachePath)) {
        return {};
      }
      const data = fs.readFileSync(this.routeCachePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return {};
    }
  }

  private async saveRouteCache(cache: any): Promise<void> {
    try {
      fs.writeFileSync(this.routeCachePath, JSON.stringify(cache, null, 2));
    } catch (error) {
      this.logger.error('Failed to save route cache:', error);
    }
  }

  private analyzeRoutePatterns(routes: OptimizedRoute[]): any {
    const patterns = {
      mostOptimizedRoutes: this.getMostOptimizedRoutes(routes),
      averageOptimizationGain: this.calculateOptimizationGain(routes),
      commonRiskFactors: this.getCommonRiskFactors(routes),
      fuelSavingsPotential: this.calculateFuelSavings(routes)
    };

    return patterns;
  }

  private getMostOptimizedRoutes(routes: OptimizedRoute[]): any[] {
    return routes
      .sort((a, b) => b.confidenceScore - a.confidenceScore)
      .slice(0, 5)
      .map(route => ({
        route: `${route.originalRoute[0]} → ${route.originalRoute[route.originalRoute.length - 1]}`,
        optimizationScore: route.confidenceScore,
        timeSaved: 0, // Calculate based on comparison
        fuelSaved: 0   // Calculate based on comparison
      }));
  }

  private calculateOptimizationGain(routes: OptimizedRoute[]): number {
    if (routes.length === 0) return 0;
    return routes.reduce((sum, route) => sum + route.confidenceScore, 0) / routes.length;
  }

  private getCommonRiskFactors(routes: OptimizedRoute[]): any {
    const riskCounts: { [key: string]: number } = {};

    routes.forEach(route => {
      route.riskFactors.forEach(risk => {
        riskCounts[risk] = (riskCounts[risk] || 0) + 1;
      });
    });

    return Object.entries(riskCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([risk, count]) => ({ risk, frequency: count }));
  }

  private calculateFuelSavings(routes: OptimizedRoute[]): number {
    // Estimate fuel savings from optimization
    return routes.reduce((savings, route) => {
      const standardCost = this.calculateFuelCost(route.distanceKm);
      const optimizedSavings = standardCost * 0.15; // Assume 15% average savings
      return savings + optimizedSavings;
    }, 0);
  }

  private getPeriodStartDate(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'today':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'year':
        return new Date(now.getFullYear(), 0, 1);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  private calculateAverage(routes: OptimizedRoute[], field: keyof OptimizedRoute): number {
    if (routes.length === 0) return 0;
    const sum = routes.reduce((total, route) => total + (Number(route[field]) || 0), 0);
    return Math.round(sum / routes.length);
  }

  private getMostCommonRoutes(routes: OptimizedRoute[]): any[] {
    const routeCounts: { [key: string]: number } = {};

    routes.forEach(route => {
      const routeKey = `${route.originalRoute[0]} → ${route.originalRoute[route.originalRoute.length - 1]}`;
      routeCounts[routeKey] = (routeCounts[routeKey] || 0) + 1;
    });

    return Object.entries(routeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([route, count]) => ({ route, frequency: count }));
  }

  private analyzeRisks(routes: OptimizedRoute[]): any {
    const totalRisks = routes.reduce((sum, route) => sum + route.riskFactors.length, 0);
    const averageRisks = routes.length > 0 ? totalRisks / routes.length : 0;

    const riskLevels = {
      low: routes.filter(r => r.riskFactors.length <= 1).length,
      medium: routes.filter(r => r.riskFactors.length === 2).length,
      high: routes.filter(r => r.riskFactors.length >= 3).length
    };

    return {
      averageRisksPerRoute: Math.round(averageRisks * 100) / 100,
      riskDistribution: riskLevels,
      mostRiskyRoutes: routes
        .sort((a, b) => b.riskFactors.length - a.riskFactors.length)
        .slice(0, 5)
        .map(route => ({
          route: `${route.originalRoute[0]} → ${route.originalRoute[route.originalRoute.length - 1]}`,
          riskCount: route.riskFactors.length,
          risks: route.riskFactors
        }))
    };
  }

  private analyzeFuelOptimization(routes: OptimizedRoute[]): any {
    const totalFuelCost = routes.reduce((sum, route) => sum + route.estimatedFuelCost, 0);
    const averageFuelCost = routes.length > 0 ? totalFuelCost / routes.length : 0;

    return {
      totalFuelCost,
      averageFuelCost: Math.round(averageFuelCost),
      estimatedSavings: this.calculateFuelSavings(routes),
      fuelEfficiencyTrends: this.calculateFuelEfficiencyTrends(routes)
    };
  }

  private analyzeTimeOptimization(routes: OptimizedRoute[]): any {
    const totalTime = routes.reduce((sum, route) => sum + route.estimatedTime, 0);
    const averageTime = routes.length > 0 ? totalTime / routes.length : 0;

    return {
      totalTimeMinutes: totalTime,
      averageTimeMinutes: Math.round(averageTime),
      timeOptimizationScore: this.calculateTimeOptimizationScore(routes)
    };
  }

  private calculateFuelEfficiencyTrends(routes: OptimizedRoute[]): any {
    // Group routes by week and calculate efficiency trends
    const weeklyData: { [key: string]: { totalCost: number, totalDistance: number, count: number } } = {};

    routes.forEach(route => {
      const week = this.getWeekKey(new Date(route.createdAt));
      if (!weeklyData[week]) {
        weeklyData[week] = { totalCost: 0, totalDistance: 0, count: 0 };
      }
      weeklyData[week].totalCost += route.estimatedFuelCost;
      weeklyData[week].totalDistance += route.distanceKm;
      weeklyData[week].count += 1;
    });

    return Object.entries(weeklyData)
      .map(([week, data]) => ({
        week,
        averageCostPerKm: Math.round(data.totalCost / data.totalDistance),
        efficiency: Math.round((data.totalDistance / data.totalCost) * 100000) / 100
      }))
      .sort((a, b) => a.week.localeCompare(b.week));
  }

  private calculateTimeOptimizationScore(routes: OptimizedRoute[]): number {
    if (routes.length === 0) return 0;

    const avgConfidence = routes.reduce((sum, route) => sum + route.confidenceScore, 0) / routes.length;
    const avgRisks = routes.reduce((sum, route) => sum + route.riskFactors.length, 0) / routes.length;

    // Higher confidence and lower risks = better time optimization
    return Math.round((avgConfidence - (avgRisks * 10)) * 100) / 100;
  }

  private getWeekKey(date: Date): string {
    const year = date.getFullYear();
    const week = this.getWeekNumber(date);
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }
}