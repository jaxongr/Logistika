import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { DataService } from '../services/data.service';
import { PerformanceService } from '../services/performance.service';

@Module({
  providers: [BotService, DataService, PerformanceService],
  exports: [BotService, DataService, PerformanceService],
})
export class BotModule {}