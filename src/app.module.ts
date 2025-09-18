import { Module, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BotModule } from './bot/bot.module';
import { DashboardApiController } from './dashboard/api.controller';
import { DataService } from './services/data.service';
import { PerformanceService } from './services/performance.service';
import { UsersService } from './services/users.service';
import { UsersController } from './users/users.controller';
import { WebSocketModule } from './websocket/websocket.module';
import { AuthController } from './auth/auth.controller';
import { AuthMiddleware } from './auth/auth.middleware';
import { AIModule } from './ai/ai.module';
import { PaymentModule } from './payment/payment.module';
import { StaffModule } from './staff/staff.module';
import { CommissionModule } from './commission/commission.module';
import { DriverPaymentsModule } from './driver-payments/driver-payments.module';
import { SettingsModule } from './settings/settings.module';
import { FinanceModule } from './finance/finance.module';
import { AnalyticsController } from './dashboard/analytics.controller';

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
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, 'auth'),
      serveRoot: '/auth',
    }),
    BotModule,
    WebSocketModule,
    AIModule,
    PaymentModule,
    StaffModule,
    CommissionModule,
    DriverPaymentsModule,
    SettingsModule,
    FinanceModule
  ],
  controllers: [AppController, DashboardApiController, AuthController, UsersController, AnalyticsController],
  providers: [AppService, DataService, PerformanceService, UsersService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes('/dashboard*', '/api/dashboard*');
  }
}