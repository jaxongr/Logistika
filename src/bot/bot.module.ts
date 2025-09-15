import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { DataService } from '../services/data.service';
import { PerformanceService } from '../services/performance.service';
import { DashboardGateway } from '../websocket/dashboard.gateway';

@Module({
  providers: [BotService, DataService, PerformanceService, DashboardGateway],
  exports: [BotService, DataService, PerformanceService, DashboardGateway],
})
export class BotModule {}