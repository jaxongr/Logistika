import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BotModule } from './bot/bot.module';
import { DashboardApiController } from './dashboard/api.controller';
import { DataService } from './services/data.service';
import { PerformanceService } from './services/performance.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, 'dashboard'),
      serveRoot: '/dashboard',
    }),
    BotModule
  ],
  controllers: [AppController, DashboardApiController],
  providers: [AppService, DataService, PerformanceService],
})
export class AppModule {}