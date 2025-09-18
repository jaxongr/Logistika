import { Module } from '@nestjs/common';
import { RouteOptimizationService } from './route-optimization.service';
import { PredictiveAnalyticsService } from './predictive-analytics.service';
import { OpenAIService } from './openai.service';
import { SmartPricingService } from './smart-pricing.service';

@Module({
  providers: [
    OpenAIService,
    RouteOptimizationService,
    PredictiveAnalyticsService,
    SmartPricingService
  ],
  exports: [
    OpenAIService,
    RouteOptimizationService,
    PredictiveAnalyticsService,
    SmartPricingService
  ]
})
export class AIModule {}