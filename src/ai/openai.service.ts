import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async optimizeRoute(routeData: any): Promise<any> {
    try {
      const prompt = `
You are an expert logistics route optimizer for Uzbekistan. Analyze this route and provide optimization suggestions:

Route: ${routeData.from} to ${routeData.to}
Distance: ${routeData.distance} km
Cargo Type: ${routeData.cargoType}
Vehicle Type: ${routeData.vehicleType}
Traffic Conditions: ${routeData.trafficConditions || 'normal'}
Weather: ${routeData.weather || 'clear'}

Provide a JSON response with:
1. optimizedRoute: array of waypoints
2. estimatedTime: in minutes
3. fuelCost: estimated cost in UZS
4. riskFactors: array of potential risks
5. alternatives: alternative routes
6. recommendations: optimization tips

Consider:
- Traffic patterns in major Uzbek cities
- Road conditions on highways
- Fuel efficiency
- Safety factors
- Time optimization
- Cost optimization

Format as valid JSON only.
      `;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      });

      const response = completion.choices[0].message.content;
      return JSON.parse(response);

    } catch (error) {
      this.logger.error('AI Route optimization error:', error);
      return this.getFallbackRoute(routeData);
    }
  }

  async predictDemand(locationData: any): Promise<any> {
    try {
      const prompt = `
Analyze logistics demand for Uzbekistan locations:

Historical Data:
${JSON.stringify(locationData.historical, null, 2)}

Current Trends:
${JSON.stringify(locationData.trends, null, 2)}

Predict demand for next 7 days considering:
- Seasonal patterns
- Economic factors
- Regional events
- Weather impact
- Market trends

Return JSON with:
1. predictions: daily demand forecast
2. peak_hours: expected busy periods
3. recommended_pricing: dynamic pricing suggestions
4. risk_assessment: potential challenges
5. opportunities: growth areas

Format as valid JSON only.
      `;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
      });

      return JSON.parse(completion.choices[0].message.content);

    } catch (error) {
      this.logger.error('AI Demand prediction error:', error);
      return this.getFallbackDemand();
    }
  }

  async optimizePricing(orderData: any, marketData: any): Promise<any> {
    try {
      const prompt = `
Optimize pricing for this logistics order in Uzbekistan:

Order Details:
- Route: ${orderData.from} → ${orderData.to}
- Distance: ${orderData.distance} km
- Cargo: ${orderData.cargoType}
- Weight: ${orderData.weight} kg
- Urgency: ${orderData.urgency}

Market Data:
- Competitor prices: ${JSON.stringify(marketData.competitors)}
- Fuel costs: ${marketData.fuelPrice} UZS/liter
- Demand level: ${marketData.demandLevel}
- Season: ${marketData.season}

Calculate optimal price considering:
- Competitive positioning
- Profit margins
- Customer value perception
- Market demand
- Operational costs

Return JSON with:
1. recommended_price: optimal price in UZS
2. price_range: min-max pricing
3. margin_analysis: profit breakdown
4. competitive_position: vs competitors
5. demand_factors: pricing influences
6. price_strategy: reasoning

Format as valid JSON only.
      `;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      });

      return JSON.parse(completion.choices[0].message.content);

    } catch (error) {
      this.logger.error('AI Pricing optimization error:', error);
      return this.getFallbackPricing(orderData);
    }
  }

  async analyzeCustomerBehavior(customerData: any): Promise<any> {
    try {
      const prompt = `
Analyze customer behavior patterns for this logistics customer:

Customer Profile:
${JSON.stringify(customerData, null, 2)}

Analyze and provide insights on:
1. Ordering patterns
2. Price sensitivity
3. Loyalty indicators
4. Risk factors
5. Growth potential
6. Preferences

Return JSON with:
1. behavior_score: 1-100 rating
2. segments: customer categorization
3. preferences: identified patterns
4. risk_level: churn risk assessment
5. recommendations: engagement strategies
6. value_potential: future revenue prediction

Format as valid JSON only.
      `;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
      });

      return JSON.parse(completion.choices[0].message.content);

    } catch (error) {
      this.logger.error('AI Customer analysis error:', error);
      return this.getFallbackCustomerAnalysis();
    }
  }

  async generateBusinessInsights(businessData: any): Promise<any> {
    try {
      const prompt = `
Generate executive business insights for this Uzbekistan logistics company:

Business Metrics:
${JSON.stringify(businessData, null, 2)}

Provide strategic insights on:
1. Growth opportunities
2. Operational efficiency
3. Market positioning
4. Risk management
5. Future planning

Write a professional executive summary in English focusing on actionable insights.
      `;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.6,
      });

      return completion.choices[0].message.content;

    } catch (error) {
      this.logger.error('AI Business insights error:', error);
      return 'Business insights temporarily unavailable.';
    }
  }

  async speechToText(audioBuffer: Buffer): Promise<string> {
    try {
      const file = new File([new Uint8Array(audioBuffer)], 'audio.wav', { type: 'audio/wav' });

      const transcription = await this.openai.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
        language: 'uz', // Uzbek language
      });

      return transcription.text;

    } catch (error) {
      this.logger.error('Speech to text error:', error);
      return '';
    }
  }

  private getFallbackRoute(routeData: any): any {
    return {
      optimizedRoute: [routeData.from, routeData.to],
      estimatedTime: routeData.distance * 1.2, // 1.2 minutes per km
      fuelCost: routeData.distance * 1200, // 1200 UZS per km
      riskFactors: ['weather', 'traffic'],
      alternatives: [],
      recommendations: ['Standard route optimization']
    };
  }

  private getFallbackDemand(): any {
    return {
      predictions: Array(7).fill(0).map((_, i) => ({
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        demand: 70 + Math.random() * 30
      })),
      peak_hours: ['09:00-11:00', '14:00-16:00'],
      recommended_pricing: { base: 100000, peak: 120000 },
      risk_assessment: 'medium',
      opportunities: ['expand routes', 'add capacity']
    };
  }

  private getFallbackPricing(orderData: any): any {
    const basePrice = orderData.distance * 1500;
    return {
      recommended_price: basePrice,
      price_range: { min: basePrice * 0.8, max: basePrice * 1.3 },
      margin_analysis: { cost: basePrice * 0.7, profit: basePrice * 0.3 },
      competitive_position: 'competitive',
      demand_factors: ['distance', 'cargo_type'],
      price_strategy: 'market-based pricing'
    };
  }

  private getFallbackCustomerAnalysis(): any {
    return {
      behavior_score: 75,
      segments: ['regular'],
      preferences: ['reliable_service'],
      risk_level: 'low',
      recommendations: ['maintain_service_quality'],
      value_potential: 'medium'
    };
  }
}