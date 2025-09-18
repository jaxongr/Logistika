import { Injectable, Logger } from '@nestjs/common';
import { OpenAIService } from './openai.service';
import { PredictiveAnalyticsService } from './predictive-analytics.service';
import * as fs from 'fs';
import * as path from 'path';

export interface PricingRequest {
  fromCity: string;
  toCity: string;
  cargoType: string;
  weight: number;
  urgency: 'normal' | 'urgent' | 'express';
  customerId?: string;
  vehicleType?: string;
  loadingDate?: string;
  unloadingDate?: string;
}

export interface PricingResponse {
  basePrice: number;
  recommendedPrice: number;
  priceRange: {
    minimum: number;
    maximum: number;
    optimal: number;
  };
  factors: Array<{
    name: string;
    impact: number;
    description: string;
  }>;
  competitiveAnalysis: {
    ourPrice: number;
    marketAverage: number;
    position: string;
    advantages: string[];
  };
  dynamicFactors: {
    demandMultiplier: number;
    seasonalMultiplier: number;
    timeMultiplier: number;
    customerMultiplier: number;
  };
  recommendations: string[];
  confidence: number;
  validUntil: string;
}

export interface PriceHistory {
  route: string;
  date: string;
  price: number;
  demandLevel: string;
  seasonalFactor: number;
  accepted: boolean;
}

@Injectable()
export class SmartPricingService {
  private readonly logger = new Logger(SmartPricingService.name);
  private readonly priceHistoryPath = path.join(process.cwd(), 'pricing-history.json');
  private readonly pricingRulesPath = path.join(process.cwd(), 'pricing-rules.json');
  private readonly marketDataPath = path.join(process.cwd(), 'market-data.json');

  constructor(
    private readonly openaiService: OpenAIService,
    private readonly analyticsService: PredictiveAnalyticsService
  ) {}

  async calculateOptimalPrice(request: PricingRequest): Promise<PricingResponse> {
    try {
      this.logger.log(`💰 Calculating optimal price: ${request.fromCity} → ${request.toCity}`);

      // Get base price calculation
      const basePrice = this.calculateBasePrice(request);

      // Get market context
      const marketData = await this.getMarketData(request);

      // Get customer insights
      const customerData = await this.getCustomerPricingData(request.customerId);

      // Apply AI optimization
      const aiOptimization = await this.openaiService.optimizePricing(request, marketData);

      // Calculate dynamic factors
      const dynamicFactors = await this.calculateDynamicFactors(request);

      // Build pricing response
      const pricingResponse = await this.buildPricingResponse(
        basePrice,
        request,
        marketData,
        customerData,
        dynamicFactors,
        aiOptimization
      );

      // Save to history
      await this.savePriceToHistory(request, pricingResponse);

      this.logger.log(`✅ Optimal price calculated: ${pricingResponse.recommendedPrice} UZS`);
      return pricingResponse;

    } catch (error) {
      this.logger.error('Pricing calculation error:', error);
      return this.getFallbackPricing(request);
    }
  }

  async updateMarketPrices(competitorData: any): Promise<void> {
    try {
      this.logger.log('📊 Updating market price data');

      const marketData = await this.loadMarketData();

      // Update competitor pricing
      Object.keys(competitorData).forEach(route => {
        if (!marketData.competitors) marketData.competitors = {};
        marketData.competitors[route] = competitorData[route];
      });

      // Update market averages
      marketData.lastUpdated = new Date().toISOString();
      marketData.marketAverages = this.calculateMarketAverages(marketData.competitors);

      await this.saveMarketData(marketData);

      this.logger.log('✅ Market prices updated');

    } catch (error) {
      this.logger.error('Market price update error:', error);
    }
  }

  async analyzePricingPerformance(period: string): Promise<any> {
    try {
      this.logger.log(`📈 Analyzing pricing performance for ${period}`);

      const priceHistory = await this.loadPriceHistory();
      const startDate = this.getPeriodStartDate(period);

      const periodPrices = priceHistory.filter(price =>
        new Date(price.date) >= startDate
      );

      const analysis = {
        totalQuotes: periodPrices.length,
        acceptanceRate: this.calculateAcceptanceRate(periodPrices),
        averagePrice: this.calculateAveragePrice(periodPrices),
        priceOptimization: this.analyzePriceOptimization(periodPrices),
        competitivePosition: await this.analyzeCompetitivePosition(periodPrices),
        recommendations: this.generatePricingRecommendations(periodPrices)
      };

      return analysis;

    } catch (error) {
      this.logger.error('Pricing performance analysis error:', error);
      throw error;
    }
  }

  async generateDynamicPricing(routes: string[], timeframe: string): Promise<any> {
    try {
      this.logger.log(`⚡ Generating dynamic pricing for ${routes.length} routes`);

      const dynamicPrices: { [route: string]: any } = {};

      for (const route of routes) {
        const [fromCity, toCity] = route.split('-');

        const request: PricingRequest = {
          fromCity,
          toCity,
          cargoType: 'general',
          weight: 1000,
          urgency: 'normal'
        };

        const pricing = await this.calculateOptimalPrice(request);

        dynamicPrices[route] = {
          basePrice: pricing.basePrice,
          currentPrice: pricing.recommendedPrice,
          priceRange: pricing.priceRange,
          demandLevel: pricing.dynamicFactors.demandMultiplier,
          timeframe,
          validUntil: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours
        };
      }

      await this.saveDynamicPrices(dynamicPrices, timeframe);

      this.logger.log(`✅ Dynamic pricing generated for ${routes.length} routes`);
      return dynamicPrices;

    } catch (error) {
      this.logger.error('Dynamic pricing generation error:', error);
      throw error;
    }
  }

  async getPriceRecommendations(customerId: string, routePreferences: any[]): Promise<any> {
    try {
      const customerInsights = await this.analyticsService.generateCustomerInsights(customerId);
      const recommendations = [];

      for (const route of routePreferences) {
        const pricing = await this.calculateOptimalPrice({
          fromCity: route.from,
          toCity: route.to,
          cargoType: route.cargoType || 'general',
          weight: route.weight || 1000,
          urgency: route.urgency || 'normal',
          customerId
        });

        recommendations.push({
          route: `${route.from} → ${route.to}`,
          recommendedPrice: pricing.recommendedPrice,
          customerDiscount: this.calculateCustomerDiscount(customerInsights),
          loyaltyBonus: this.calculateLoyaltyBonus(customerInsights),
          priceValidUntil: pricing.validUntil
        });
      }

      return {
        customerId,
        customerSegment: customerInsights.segments?.[0] || 'standard',
        recommendations,
        specialOffers: this.generateSpecialOffers(customerInsights)
      };

    } catch (error) {
      this.logger.error('Price recommendations error:', error);
      throw error;
    }
  }

  private calculateBasePrice(request: PricingRequest): number {
    const distance = this.calculateDistance(request.fromCity, request.toCity);

    // Base rate per km
    let baseRatePerKm = 500; // 500 UZS per km

    // Cargo type multiplier
    const cargoMultipliers = {
      'general': 1.0,
      'fragile': 1.3,
      'hazardous': 1.8,
      'oversized': 1.5,
      'refrigerated': 1.4,
      'liquid': 1.2,
      'bulk': 0.8
    };

    baseRatePerKm *= cargoMultipliers[request.cargoType] || 1.0;

    // Weight factor
    const weightFactor = this.calculateWeightFactor(request.weight);

    // Urgency multiplier
    const urgencyMultipliers = {
      'normal': 1.0,
      'urgent': 1.3,
      'express': 1.6
    };

    const urgencyMultiplier = urgencyMultipliers[request.urgency] || 1.0;

    // Calculate base price
    const basePrice = distance * baseRatePerKm * weightFactor * urgencyMultiplier;

    // Add minimum price threshold
    const minimumPrice = 50000; // 50,000 UZS minimum

    return Math.max(basePrice, minimumPrice);
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

  private calculateWeightFactor(weight: number): number {
    if (weight <= 1000) return 1.0;
    if (weight <= 5000) return 1.2;
    if (weight <= 10000) return 1.5;
    if (weight <= 20000) return 2.0;
    return 2.5;
  }

  private async getMarketData(request: PricingRequest): Promise<any> {
    try {
      const marketData = await this.loadMarketData();
      const route = `${request.fromCity}-${request.toCity}`;

      return {
        competitors: marketData.competitors?.[route] || {},
        marketAverage: marketData.marketAverages?.[route] || 0,
        fuelPrice: marketData.fuelPrice || 8000,
        demandLevel: this.getCurrentDemandLevel(request),
        season: this.getCurrentSeason(),
        lastUpdated: marketData.lastUpdated
      };
    } catch (error) {
      return this.getDefaultMarketData();
    }
  }

  private async getCustomerPricingData(customerId?: string): Promise<any> {
    if (!customerId) {
      return {
        segment: 'new',
        loyalty: 0,
        priceElasticity: 0.5,
        averageOrderValue: 0
      };
    }

    try {
      const customerInsights = await this.analyticsService.generateCustomerInsights(customerId);

      return {
        segment: customerInsights.segments?.[0] || 'standard',
        loyalty: customerInsights.behavior_score || 0,
        priceElasticity: this.calculatePriceElasticity(customerInsights),
        averageOrderValue: customerInsights.value_potential || 0
      };
    } catch (error) {
      return {
        segment: 'standard',
        loyalty: 50,
        priceElasticity: 0.5,
        averageOrderValue: 150000
      };
    }
  }

  private async calculateDynamicFactors(request: PricingRequest): Promise<any> {
    const factors = {
      demandMultiplier: await this.calculateDemandMultiplier(request),
      seasonalMultiplier: this.calculateSeasonalMultiplier(),
      timeMultiplier: this.calculateTimeMultiplier(request.loadingDate),
      customerMultiplier: await this.calculateCustomerMultiplier(request.customerId)
    };

    return factors;
  }

  private async calculateDemandMultiplier(request: PricingRequest): Promise<number> {
    try {
      const predictions = await this.analyticsService.predictDemand(7);
      const route = `${request.fromCity}-${request.toCity}`;

      // Find current demand for this route
      const todayPrediction = predictions.find(p =>
        p.date === new Date().toISOString().split('T')[0]
      );

      if (todayPrediction) {
        const routeDemand = todayPrediction.routes.find(r =>
          `${r.from}-${r.to}` === route
        );

        if (routeDemand) {
          // Convert demand to multiplier (5-15 demand range -> 0.8-1.3 multiplier)
          return Math.max(0.8, Math.min(1.3, 0.8 + (routeDemand.expectedDemand / 15) * 0.5));
        }
      }

      return 1.0; // Default multiplier
    } catch (error) {
      return 1.0;
    }
  }

  private calculateSeasonalMultiplier(): number {
    const month = new Date().getMonth();

    // Summer months (June-August) have higher demand
    if (month >= 5 && month <= 7) return 1.1;

    // Winter months (December-February) have lower demand
    if (month === 11 || month <= 1) return 0.9;

    // Harvest season (September-October) has higher demand
    if (month === 8 || month === 9) return 1.15;

    return 1.0;
  }

  private calculateTimeMultiplier(loadingDate?: string): number {
    const now = new Date();
    const loading = loadingDate ? new Date(loadingDate) : now;

    const hour = loading.getHours();
    const dayOfWeek = loading.getDay();

    let multiplier = 1.0;

    // Peak hours (8-10 AM, 2-4 PM)
    if ((hour >= 8 && hour <= 10) || (hour >= 14 && hour <= 16)) {
      multiplier *= 1.1;
    }

    // Rush hours (7-9 AM, 5-7 PM)
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
      multiplier *= 1.15;
    }

    // Monday and Friday are busier
    if (dayOfWeek === 1 || dayOfWeek === 5) {
      multiplier *= 1.05;
    }

    // Weekend premium
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      multiplier *= 1.2;
    }

    return multiplier;
  }

  private async calculateCustomerMultiplier(customerId?: string): Promise<number> {
    if (!customerId) return 1.0;

    try {
      const customerData = await this.getCustomerPricingData(customerId);

      let multiplier = 1.0;

      // Loyalty discount
      if (customerData.loyalty > 80) {
        multiplier *= 0.95; // 5% discount for very loyal customers
      } else if (customerData.loyalty > 60) {
        multiplier *= 0.97; // 3% discount for loyal customers
      }

      // Volume discount
      if (customerData.averageOrderValue > 500000) {
        multiplier *= 0.93; // 7% discount for high-value customers
      } else if (customerData.averageOrderValue > 300000) {
        multiplier *= 0.95; // 5% discount for medium-value customers
      }

      // New customer incentive
      if (customerData.segment === 'new') {
        multiplier *= 0.9; // 10% discount for new customers
      }

      return multiplier;
    } catch (error) {
      return 1.0;
    }
  }

  private async buildPricingResponse(
    basePrice: number,
    request: PricingRequest,
    marketData: any,
    customerData: any,
    dynamicFactors: any,
    aiOptimization: any
  ): Promise<PricingResponse> {

    // Apply dynamic factors
    const dynamicPrice = basePrice *
      dynamicFactors.demandMultiplier *
      dynamicFactors.seasonalMultiplier *
      dynamicFactors.timeMultiplier *
      dynamicFactors.customerMultiplier;

    // Use AI recommendation if available
    let recommendedPrice = aiOptimization?.recommended_price || dynamicPrice;

    // Ensure price is within reasonable bounds
    const minPrice = basePrice * 0.7;
    const maxPrice = basePrice * 1.5;
    recommendedPrice = Math.max(minPrice, Math.min(maxPrice, recommendedPrice));

    // Build price range
    const priceRange = {
      minimum: Math.round(recommendedPrice * 0.85),
      maximum: Math.round(recommendedPrice * 1.2),
      optimal: Math.round(recommendedPrice)
    };

    // Analyze factors
    const factors = this.analyzePricingFactors(basePrice, dynamicFactors, aiOptimization);

    // Competitive analysis
    const competitiveAnalysis = this.buildCompetitiveAnalysis(recommendedPrice, marketData);

    // Generate recommendations
    const recommendations = this.generatePricingRecommendations([]);

    return {
      basePrice: Math.round(basePrice),
      recommendedPrice: Math.round(recommendedPrice),
      priceRange,
      factors,
      competitiveAnalysis,
      dynamicFactors,
      recommendations,
      confidence: this.calculatePricingConfidence(aiOptimization),
      validUntil: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours
    };
  }

  private analyzePricingFactors(basePrice: number, dynamicFactors: any, aiOptimization: any): Array<{
    name: string;
    impact: number;
    description: string;
  }> {
    const factors = [];

    // Demand factor
    if (dynamicFactors.demandMultiplier !== 1.0) {
      factors.push({
        name: 'demand',
        impact: Math.round((dynamicFactors.demandMultiplier - 1) * 100),
        description: dynamicFactors.demandMultiplier > 1 ? 'High demand increases price' : 'Low demand reduces price'
      });
    }

    // Seasonal factor
    if (dynamicFactors.seasonalMultiplier !== 1.0) {
      factors.push({
        name: 'seasonal',
        impact: Math.round((dynamicFactors.seasonalMultiplier - 1) * 100),
        description: 'Seasonal demand adjustment'
      });
    }

    // Time factor
    if (dynamicFactors.timeMultiplier !== 1.0) {
      factors.push({
        name: 'timing',
        impact: Math.round((dynamicFactors.timeMultiplier - 1) * 100),
        description: 'Peak time pricing adjustment'
      });
    }

    // Customer factor
    if (dynamicFactors.customerMultiplier !== 1.0) {
      factors.push({
        name: 'customer_loyalty',
        impact: Math.round((dynamicFactors.customerMultiplier - 1) * 100),
        description: dynamicFactors.customerMultiplier < 1 ? 'Loyalty discount applied' : 'Customer premium'
      });
    }

    return factors;
  }

  private buildCompetitiveAnalysis(ourPrice: number, marketData: any): any {
    const marketAverage = marketData.marketAverage || ourPrice;

    let position = 'competitive';
    const advantages = [];

    if (ourPrice < marketAverage * 0.9) {
      position = 'low_cost';
      advantages.push('Price advantage');
    } else if (ourPrice > marketAverage * 1.1) {
      position = 'premium';
      advantages.push('Premium service');
    }

    advantages.push('AI-optimized pricing', 'Dynamic adjustments', 'Customer-specific offers');

    return {
      ourPrice,
      marketAverage: Math.round(marketAverage),
      position,
      advantages
    };
  }

  private calculatePricingConfidence(aiOptimization: any): number {
    let confidence = 75; // Base confidence

    if (aiOptimization?.recommended_price) {
      confidence += 15; // AI recommendation available
    }

    if (aiOptimization?.margin_analysis) {
      confidence += 10; // Detailed analysis available
    }

    return Math.min(95, confidence);
  }

  private getCurrentDemandLevel(request: PricingRequest): string {
    const popularRoutes = [
      'Toshkent-Samarqand',
      'Toshkent-Buxoro',
      'Toshkent-Andijon'
    ];

    const route = `${request.fromCity}-${request.toCity}`;

    if (popularRoutes.includes(route)) return 'high';
    return 'medium';
  }

  private getCurrentSeason(): string {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }

  private getDefaultMarketData(): any {
    return {
      competitors: {},
      marketAverage: 150000,
      fuelPrice: 8000,
      demandLevel: 'medium',
      season: 'spring',
      lastUpdated: new Date().toISOString()
    };
  }

  private calculatePriceElasticity(customerInsights: any): number {
    // Higher loyalty customers are less price sensitive
    const loyalty = customerInsights.behavior_score || 50;
    return Math.max(0.2, Math.min(0.8, 0.8 - (loyalty / 100) * 0.6));
  }

  private calculateCustomerDiscount(customerInsights: any): number {
    const loyalty = customerInsights.behavior_score || 0;

    if (loyalty > 90) return 10; // 10% discount
    if (loyalty > 75) return 7;  // 7% discount
    if (loyalty > 60) return 5;  // 5% discount
    if (loyalty > 40) return 3;  // 3% discount

    return 0;
  }

  private calculateLoyaltyBonus(customerInsights: any): number {
    const totalOrders = customerInsights.totalOrders || 0;

    if (totalOrders > 50) return 5000;  // 5000 UZS bonus
    if (totalOrders > 20) return 3000;  // 3000 UZS bonus
    if (totalOrders > 10) return 2000;  // 2000 UZS bonus

    return 0;
  }

  private generateSpecialOffers(customerInsights: any): any[] {
    const offers = [];

    if (customerInsights.segments?.includes('frequent')) {
      offers.push({
        type: 'volume_discount',
        title: 'Frequent Customer Discount',
        description: '15% off orders over 300,000 UZS',
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    if (customerInsights.risk_level === 'low') {
      offers.push({
        type: 'credit_terms',
        title: 'Extended Payment Terms',
        description: '30-day payment terms available',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    return offers;
  }

  private getFallbackPricing(request: PricingRequest): PricingResponse {
    const basePrice = this.calculateBasePrice(request);

    return {
      basePrice: Math.round(basePrice),
      recommendedPrice: Math.round(basePrice * 1.1),
      priceRange: {
        minimum: Math.round(basePrice * 0.9),
        maximum: Math.round(basePrice * 1.3),
        optimal: Math.round(basePrice * 1.1)
      },
      factors: [],
      competitiveAnalysis: {
        ourPrice: Math.round(basePrice * 1.1),
        marketAverage: Math.round(basePrice),
        position: 'competitive',
        advantages: ['Standard pricing']
      },
      dynamicFactors: {
        demandMultiplier: 1.0,
        seasonalMultiplier: 1.0,
        timeMultiplier: 1.0,
        customerMultiplier: 1.0
      },
      recommendations: ['Standard pricing applied'],
      confidence: 60,
      validUntil: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    };
  }

  // File operations and helper methods
  private async loadPriceHistory(): Promise<PriceHistory[]> {
    try {
      if (!fs.existsSync(this.priceHistoryPath)) {
        return [];
      }
      const data = fs.readFileSync(this.priceHistoryPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  private async savePriceToHistory(request: PricingRequest, response: PricingResponse): Promise<void> {
    try {
      const history = await this.loadPriceHistory();

      const historyEntry: PriceHistory = {
        route: `${request.fromCity}-${request.toCity}`,
        date: new Date().toISOString(),
        price: response.recommendedPrice,
        demandLevel: this.getCurrentDemandLevel(request),
        seasonalFactor: response.dynamicFactors.seasonalMultiplier,
        accepted: false // Will be updated when order is accepted
      };

      history.push(historyEntry);

      // Keep only last 1000 entries
      if (history.length > 1000) {
        history.splice(0, history.length - 1000);
      }

      fs.writeFileSync(this.priceHistoryPath, JSON.stringify(history, null, 2));
    } catch (error) {
      this.logger.error('Failed to save price history:', error);
    }
  }

  private async loadMarketData(): Promise<any> {
    try {
      if (!fs.existsSync(this.marketDataPath)) {
        return {};
      }
      const data = fs.readFileSync(this.marketDataPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return {};
    }
  }

  private async saveMarketData(marketData: any): Promise<void> {
    try {
      fs.writeFileSync(this.marketDataPath, JSON.stringify(marketData, null, 2));
    } catch (error) {
      this.logger.error('Failed to save market data:', error);
    }
  }

  private async saveDynamicPrices(prices: any, timeframe: string): Promise<void> {
    try {
      const dynamicPricesPath = path.join(process.cwd(), `dynamic-prices-${timeframe}.json`);
      fs.writeFileSync(dynamicPricesPath, JSON.stringify(prices, null, 2));
    } catch (error) {
      this.logger.error('Failed to save dynamic prices:', error);
    }
  }

  private calculateMarketAverages(competitors: any): any {
    const averages: { [route: string]: number } = {};

    Object.keys(competitors).forEach(route => {
      const prices = Object.values(competitors[route]);
      if (prices.length > 0) {
        averages[route] = (prices as number[]).reduce((sum: number, price: number) => sum + price, 0) / prices.length;
      }
    });

    return averages;
  }

  private calculateAcceptanceRate(prices: PriceHistory[]): number {
    if (prices.length === 0) return 0;
    const accepted = prices.filter(p => p.accepted).length;
    return Math.round((accepted / prices.length) * 100);
  }

  private calculateAveragePrice(prices: PriceHistory[]): number {
    if (prices.length === 0) return 0;
    return Math.round(prices.reduce((sum, p) => sum + p.price, 0) / prices.length);
  }

  private analyzePriceOptimization(prices: PriceHistory[]): any {
    // Implementation for price optimization analysis
    return {
      optimalPriceRange: { min: 100000, max: 200000 },
      priceElasticity: -0.5,
      recommendedAdjustment: 'increase_by_5_percent'
    };
  }

  private async analyzeCompetitivePosition(prices: PriceHistory[]): Promise<any> {
    const marketData = await this.loadMarketData();

    return {
      position: 'competitive',
      priceAdvantage: 5, // 5% lower than market average
      recommendations: ['maintain_current_pricing', 'monitor_competitors']
    };
  }

  private generatePricingRecommendations(prices: PriceHistory[]): string[] {
    const recommendations = [];

    if (prices.length > 0) {
      const acceptanceRate = this.calculateAcceptanceRate(prices);

      if (acceptanceRate < 70) {
        recommendations.push('Consider reducing prices by 5-10%');
      } else if (acceptanceRate > 90) {
        recommendations.push('Consider increasing prices by 3-5%');
      }
    }

    recommendations.push(
      'Monitor competitor pricing regularly',
      'Implement dynamic pricing based on demand',
      'Offer loyalty discounts to repeat customers',
      'Consider premium pricing for express services'
    );

    return recommendations;
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
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }
}