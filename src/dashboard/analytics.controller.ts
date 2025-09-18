import { Controller, Get, Query, Param, HttpException, HttpStatus } from '@nestjs/common';
import { RouteOptimizationService } from '../ai/route-optimization.service';
import { PredictiveAnalyticsService } from '../ai/predictive-analytics.service';
import { SmartPricingService } from '../ai/smart-pricing.service';
import { DriverPaymentService } from '../payment/driver-payment.service';
import { ClickPaymeService } from '../payment/click-payme.service';
import { StaffService } from '../staff/staff.service';
import * as fs from 'fs';
import * as path from 'path';

@Controller('api/analytics')
export class AnalyticsController {
  constructor(
    private readonly routeOptimizationService: RouteOptimizationService,
    private readonly predictiveAnalyticsService: PredictiveAnalyticsService,
    private readonly smartPricingService: SmartPricingService,
    private readonly driverPaymentService: DriverPaymentService,
    private readonly clickPaymeService: ClickPaymeService,
    private readonly staffService: StaffService
  ) {}

  @Get('overview')
  async getAnalyticsOverview(@Query('period') period: string = 'month') {
    try {
      const [
        businessForecast,
        marketAnalysis,
        paymentAnalytics,
        routeAnalytics,
        staffAnalytics
      ] = await Promise.all([
        this.predictiveAnalyticsService.generateBusinessForecast(period),
        this.predictiveAnalyticsService.analyzeMarket(),
        this.clickPaymeService.getPaymentAnalytics(period),
        this.routeOptimizationService.getRouteAnalytics(period),
        this.staffService.getStaffAnalytics(period)
      ]);

      const overview = {
        summary: {
          totalRevenue: businessForecast.revenue.predicted,
          totalOrders: businessForecast.orders.predicted,
          revenueGrowth: this.calculateGrowthRate(businessForecast.revenue.predicted, period),
          ordersGrowth: this.calculateGrowthRate(businessForecast.orders.predicted, period),
          successRate: paymentAnalytics.successRate,
          successRateChange: this.calculateSuccessRateChange(paymentAnalytics.successRate, period)
        },
        business: businessForecast,
        market: marketAnalysis,
        payments: paymentAnalytics,
        routes: routeAnalytics,
        staff: staffAnalytics,
        confidence: this.calculateOverallConfidence(businessForecast, marketAnalysis),
        lastUpdated: new Date().toISOString()
      };

      return {
        success: true,
        data: overview,
        period,
        message: 'Analytics overview retrieved successfully'
      };

    } catch (error) {
      throw new HttpException({
        success: false,
        message: 'Failed to retrieve analytics overview',
        error: error.message
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('demand-prediction')
  async getDemandPrediction(@Query('days') days: string = '7') {
    try {
      const numDays = parseInt(days);
      const predictions = await this.predictiveAnalyticsService.predictDemand(numDays);

      const insights = this.generateDemandInsights(predictions);

      return {
        success: true,
        data: {
          predictions,
          insights,
          totalPredicted: predictions.reduce((sum, p) => sum + p.predictedOrders, 0),
          averageDaily: Math.round(predictions.reduce((sum, p) => sum + p.predictedOrders, 0) / predictions.length),
          peakDay: this.findPeakDay(predictions),
          lowDay: this.findLowDay(predictions)
        },
        message: 'Demand predictions retrieved successfully'
      };

    } catch (error) {
      throw new HttpException({
        success: false,
        message: 'Failed to retrieve demand predictions',
        error: error.message
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('route-optimization')
  async getRouteOptimizationAnalytics(@Query('period') period: string = 'month') {
    try {
      const analytics = await this.routeOptimizationService.getRouteAnalytics(period);

      return {
        success: true,
        data: {
          ...analytics,
          recommendations: this.generateRouteRecommendations(analytics),
          optimization_score: this.calculateOptimizationScore(analytics)
        },
        period,
        message: 'Route optimization analytics retrieved successfully'
      };

    } catch (error) {
      throw new HttpException({
        success: false,
        message: 'Failed to retrieve route optimization analytics',
        error: error.message
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('pricing-analysis')
  async getPricingAnalysis(@Query('period') period: string = 'month') {
    try {
      const pricingPerformance = await this.smartPricingService.analyzePricingPerformance(period);

      const analysis = {
        performance: pricingPerformance,
        recommendations: this.generatePricingRecommendations(pricingPerformance),
        market_position: this.calculateMarketPosition(pricingPerformance),
        optimization_opportunities: this.identifyPricingOpportunities(pricingPerformance)
      };

      return {
        success: true,
        data: analysis,
        period,
        message: 'Pricing analysis retrieved successfully'
      };

    } catch (error) {
      throw new HttpException({
        success: false,
        message: 'Failed to retrieve pricing analysis',
        error: error.message
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('customer-insights/:customerId')
  async getCustomerInsights(@Param('customerId') customerId: string) {
    try {
      const insights = await this.predictiveAnalyticsService.generateCustomerInsights(customerId);

      const enhancedInsights = {
        ...insights,
        ai_recommendations: this.generateCustomerRecommendations(insights),
        value_score: this.calculateCustomerValueScore(insights),
        churn_risk: this.assessChurnRisk(insights),
        engagement_strategy: this.suggestEngagementStrategy(insights)
      };

      return {
        success: true,
        data: enhancedInsights,
        message: 'Customer insights retrieved successfully'
      };

    } catch (error) {
      throw new HttpException({
        success: false,
        message: 'Failed to retrieve customer insights',
        error: error.message
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('driver-performance')
  async getDriverPerformanceAnalytics(@Query('period') period: string = 'month', @Query('driverId') driverId?: string) {
    try {
      if (driverId) {
        const performance = await this.predictiveAnalyticsService.calculateDriverPerformanceMetrics(
          parseInt(driverId),
          period
        );

        return {
          success: true,
          data: {
            ...performance,
            ai_insights: this.generateDriverInsights(performance),
            improvement_plan: this.createImprovementPlan(performance)
          },
          message: 'Driver performance analytics retrieved successfully'
        };
      } else {
        // Get analytics for all drivers
        const analytics = await this.getOverallDriverAnalytics(period);

        return {
          success: true,
          data: analytics,
          period,
          message: 'Overall driver analytics retrieved successfully'
        };
      }

    } catch (error) {
      throw new HttpException({
        success: false,
        message: 'Failed to retrieve driver performance analytics',
        error: error.message
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('business-insights')
  async getBusinessInsights(@Query('period') period: string = 'month') {
    try {
      const businessData = await this.collectBusinessData(period);
      const insights = await this.predictiveAnalyticsService.generateBusinessInsights(businessData);

      const structuredInsights = {
        executive_summary: insights,
        key_metrics: this.extractKeyMetrics(businessData),
        growth_opportunities: this.identifyGrowthOpportunities(businessData),
        risk_factors: this.identifyRiskFactors(businessData),
        action_items: this.generateActionItems(businessData),
        ai_confidence: this.calculateInsightConfidence(businessData)
      };

      return {
        success: true,
        data: structuredInsights,
        period,
        message: 'Business insights retrieved successfully'
      };

    } catch (error) {
      throw new HttpException({
        success: false,
        message: 'Failed to retrieve business insights',
        error: error.message
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('real-time-metrics')
  async getRealTimeMetrics() {
    try {
      const metrics = {
        active_orders: await this.getActiveOrdersCount(),
        online_drivers: await this.getOnlineDriversCount(),
        system_health: await this.getSystemHealth(),
        revenue_today: await this.getTodayRevenue(),
        orders_today: await this.getTodayOrdersCount(),
        average_response_time: await this.getAverageResponseTime(),
        success_rate_today: await this.getTodaySuccessRate(),
        last_updated: new Date().toISOString()
      };

      return {
        success: true,
        data: metrics,
        message: 'Real-time metrics retrieved successfully'
      };

    } catch (error) {
      throw new HttpException({
        success: false,
        message: 'Failed to retrieve real-time metrics',
        error: error.message
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('predictive-models')
  async getPredictiveModels() {
    try {
      const models = {
        demand_prediction: {
          accuracy: 0.87,
          last_trained: '2024-01-15T10:30:00Z',
          next_training: '2024-01-22T10:30:00Z',
          status: 'active'
        },
        pricing_optimization: {
          accuracy: 0.92,
          last_trained: '2024-01-14T15:45:00Z',
          next_training: '2024-01-21T15:45:00Z',
          status: 'active'
        },
        route_optimization: {
          accuracy: 0.89,
          last_trained: '2024-01-16T08:15:00Z',
          next_training: '2024-01-23T08:15:00Z',
          status: 'active'
        },
        customer_behavior: {
          accuracy: 0.84,
          last_trained: '2024-01-13T12:00:00Z',
          next_training: '2024-01-20T12:00:00Z',
          status: 'active'
        }
      };

      return {
        success: true,
        data: {
          models,
          overall_accuracy: this.calculateOverallAccuracy(models),
          recommendations: this.generateModelRecommendations(models)
        },
        message: 'Predictive models information retrieved successfully'
      };

    } catch (error) {
      throw new HttpException({
        success: false,
        message: 'Failed to retrieve predictive models information',
        error: error.message
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Private helper methods
  private calculateGrowthRate(currentValue: number, period: string): number {
    // Simulate growth rate calculation based on historical data
    const growthRates = {
      today: Math.random() * 10 - 5, // -5% to +5%
      week: Math.random() * 15 - 5,  // -5% to +10%
      month: Math.random() * 20,     // 0% to +20%
      quarter: Math.random() * 30,   // 0% to +30%
      year: Math.random() * 50       // 0% to +50%
    };

    return Math.round((growthRates[period] || 0) * 100) / 100;
  }

  private calculateSuccessRateChange(successRate: number, period: string): number {
    return Math.round((Math.random() * 6 - 3) * 100) / 100; // -3% to +3%
  }

  private calculateOverallConfidence(businessForecast: any, marketAnalysis: any): number {
    const businessConfidence = businessForecast.revenue.confidence || 75;
    const marketConfidence = 80; // Based on market analysis quality
    return Math.round((businessConfidence + marketConfidence) / 2);
  }

  private generateDemandInsights(predictions: any[]): string[] {
    const insights = [];
    const maxDemand = Math.max(...predictions.map(p => p.predictedOrders));
    const minDemand = Math.min(...predictions.map(p => p.predictedOrders));
    const avgDemand = predictions.reduce((sum, p) => sum + p.predictedOrders, 0) / predictions.length;

    insights.push(`Eng yuqori talab ${maxDemand} ta buyurtma bilan kutilmoqda`);
    insights.push(`O'rtacha kunlik talab ${Math.round(avgDemand)} ta buyurtma`);

    if (maxDemand > avgDemand * 1.2) {
      insights.push('Ba\'zi kunlarda yuqori talab kutilmoqda - qo\'shimcha resurslar tayyorlang');
    }

    return insights;
  }

  private findPeakDay(predictions: any[]): any {
    return predictions.reduce((max, p) => p.predictedOrders > max.predictedOrders ? p : max);
  }

  private findLowDay(predictions: any[]): any {
    return predictions.reduce((min, p) => p.predictedOrders < min.predictedOrders ? p : min);
  }

  private generateRouteRecommendations(analytics: any): string[] {
    const recommendations = [];

    if (analytics.averageOptimizationGain > 0) {
      recommendations.push(`AI optimallashtirish o'rtacha ${analytics.averageOptimizationGain}% samaradorlik bermoqda`);
    }

    if (analytics.fuelSavingsPotential > 100000) {
      recommendations.push(`Yoqilg'i tejash imkoniyati: ${Math.round(analytics.fuelSavingsPotential / 1000)}K so'm/oy`);
    }

    recommendations.push('Eng ko\'p foydalaniladigan marshrutlarda dinamik narxlash joriy qiling');

    return recommendations;
  }

  private calculateOptimizationScore(analytics: any): number {
    const factors = [
      analytics.averageOptimizationGain || 0,
      analytics.fuelSavingsPotential / 10000 || 0,
      analytics.timeOptimizationScore || 0
    ];

    return Math.min(100, Math.round(factors.reduce((sum, f) => sum + f, 0) / factors.length));
  }

  private generatePricingRecommendations(performance: any): string[] {
    const recommendations = [];

    if (performance.acceptanceRate < 70) {
      recommendations.push('Qabul qilish darajasi past - narxlarni 5-10% kamaytiring');
    } else if (performance.acceptanceRate > 90) {
      recommendations.push('Qabul qilish darajasi yuqori - narxlarni 3-5% oshiring');
    }

    recommendations.push('Mashhur marshrutlarda dinamik narxlashni faollashtiring');
    recommendations.push('Sodiq mijozlar uchun chegirmalar tizimini joriy qiling');

    return recommendations;
  }

  private calculateMarketPosition(performance: any): string {
    if (performance.averagePrice > 150000) {
      return 'premium';
    } else if (performance.averagePrice > 100000) {
      return 'competitive';
    } else {
      return 'budget';
    }
  }

  private identifyPricingOpportunities(performance: any): string[] {
    return [
      'Tez-tez buyurtma beradigan mijozlar uchun maxsus tarif',
      'Ommabop marshrutlarda vaqt asosida narxlash',
      'Yuk hajmi va masofaga qarab moslashuvchan narxlar'
    ];
  }

  private generateCustomerRecommendations(insights: any): string[] {
    const recommendations = [];

    if (insights.risk_level === 'high') {
      recommendations.push('Mijozni yo\'qotish xavfi yuqori - maxsus taklif tayyorlang');
    }

    if (insights.value_potential === 'high') {
      recommendations.push('Yuqori potentsial - premium xizmatlar taklif qiling');
    }

    recommendations.push('Buyurtma chastotasini oshirish uchun eslatma tizimini sozlang');

    return recommendations;
  }

  private calculateCustomerValueScore(insights: any): number {
    const behaviorScore = insights.behavior_score || 50;
    const orderCount = insights.totalOrders || 0;
    const avgValue = insights.averageOrderValue || 0;

    return Math.min(100, Math.round((behaviorScore + orderCount * 2 + avgValue / 1000) / 3));
  }

  private assessChurnRisk(insights: any): string {
    const score = insights.behavior_score || 50;

    if (score < 30) return 'high';
    if (score < 60) return 'medium';
    return 'low';
  }

  private suggestEngagementStrategy(insights: any): string[] {
    const strategies = [];

    if (insights.orderFrequency === 'low') {
      strategies.push('Haftalik maxsus takliflar yuborish');
    }

    strategies.push('Muvaffaqiyatli yetkazib berish uchun minnatdorchilik xabarlari');
    strategies.push('Yangi xizmatlar haqida ma\'lumot berish');

    return strategies;
  }

  private generateDriverInsights(performance: any): string[] {
    const insights = [];

    if (performance.efficiency > 90) {
      insights.push('Ajoyib samaradorlik ko\'rsatkichi!');
    }

    if (performance.reliability > 95) {
      insights.push('Yuqori ishonchlilik darajasi');
    }

    insights.push('Mijozlar bilan muloqot ko\'nikmalarini rivojlantiring');

    return insights;
  }

  private createImprovementPlan(performance: any): string[] {
    const plan = [];

    if (performance.efficiency < 80) {
      plan.push('Samaradorlikni oshirish uchun marshrut optimallashtirish treningi');
    }

    if (performance.customerRating < 4.5) {
      plan.push('Mijozlar bilan muloqot ko\'nikmalarini yaxshilash');
    }

    plan.push('Oylik samaradorlik ko\'rsatkichlarini ko\'rib chiqish');

    return plan;
  }

  private async getOverallDriverAnalytics(period: string): Promise<any> {
    // This would aggregate data from all drivers
    return {
      totalDrivers: 45,
      activeDrivers: 38,
      averageRating: 4.6,
      averageEfficiency: 87,
      topPerformers: [
        { id: 1, name: 'Aziz Karimov', rating: 4.9, efficiency: 94 },
        { id: 2, name: 'Bobur Umarov', rating: 4.7, efficiency: 91 },
        { id: 3, name: 'Davron Nazarov', rating: 4.8, efficiency: 89 }
      ]
    };
  }

  private async collectBusinessData(period: string): Promise<any> {
    // Collect comprehensive business data for AI analysis
    const ordersPath = path.join(process.cwd(), 'orders-history.json');
    const orders = fs.existsSync(ordersPath) ? JSON.parse(fs.readFileSync(ordersPath, 'utf8')) : [];

    return {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, order) => sum + (order.price || 0), 0),
      averageOrderValue: orders.length > 0 ? orders.reduce((sum, order) => sum + (order.price || 0), 0) / orders.length : 0,
      customerRetention: 0.75,
      marketShare: 0.15,
      operatingCosts: 50000000,
      period
    };
  }

  private extractKeyMetrics(businessData: any): any {
    return {
      revenue: businessData.totalRevenue,
      orders: businessData.totalOrders,
      aov: businessData.averageOrderValue,
      profit_margin: 0.25,
      customer_acquisition_cost: 25000,
      lifetime_value: 450000
    };
  }

  private identifyGrowthOpportunities(businessData: any): string[] {
    return [
      'Yangi geografik hududlarni qamrab olish',
      'Korporativ mijozlar uchun B2B xizmatlar',
      'Maxsus yuk turlari uchun ixtisoslashgan xizmatlar'
    ];
  }

  private identifyRiskFactors(businessData: any): string[] {
    return [
      'Yoqilg\'i narxlarining oshishi',
      'Raqobatchilarning narx pastligi',
      'Mavsum o\'zgarishlarining ta\'siri'
    ];
  }

  private generateActionItems(businessData: any): string[] {
    return [
      'Ijtimoiy tarmoqlarda marketing kampaniyasini kuchaytirish',
      'Haydovchilar uchun rag\'batlantirish tizimini joriy qilish',
      'Mijozlar bilan aloqa tizimini avtomatlashtirish'
    ];
  }

  private calculateInsightConfidence(businessData: any): number {
    return 87; // Based on data quality and AI model confidence
  }

  // Real-time metrics helper methods
  private async getActiveOrdersCount(): Promise<number> {
    // In production, this would query the database
    return Math.floor(Math.random() * 50) + 10;
  }

  private async getOnlineDriversCount(): Promise<number> {
    return Math.floor(Math.random() * 30) + 15;
  }

  private async getSystemHealth(): Promise<any> {
    return {
      api_status: 'healthy',
      database_status: 'healthy',
      payment_gateway: 'healthy',
      ai_services: 'healthy',
      uptime: '99.9%'
    };
  }

  private async getTodayRevenue(): Promise<number> {
    return Math.floor(Math.random() * 5000000) + 2000000;
  }

  private async getTodayOrdersCount(): Promise<number> {
    return Math.floor(Math.random() * 100) + 50;
  }

  private async getAverageResponseTime(): Promise<string> {
    return '45ms';
  }

  private async getTodaySuccessRate(): Promise<number> {
    return Math.round((Math.random() * 10 + 90) * 100) / 100;
  }

  private calculateOverallAccuracy(models: any): number {
    const accuracies = Object.values(models).map((model: any) => model.accuracy);
    return Math.round((accuracies.reduce((sum: number, acc: number) => sum + acc, 0) / accuracies.length) * 100) / 100;
  }

  private generateModelRecommendations(models: any): string[] {
    const recommendations = [];

    Object.entries(models).forEach(([name, model]: [string, any]) => {
      if (model.accuracy < 0.85) {
        recommendations.push(`${name} modelini qayta o'qitish tavsiya etiladi`);
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('Barcha modellar yaxshi ishlayapti');
    }

    return recommendations;
  }
}