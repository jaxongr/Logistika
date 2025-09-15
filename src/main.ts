import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BotService } from './bot/bot.service';

async function bootstrap() {
  // Log level-ni kam qilish uchun
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn']  // Faqat error va warning log-lar
  });

  // CORS ni yoqish
  app.enableCors();

  // BotService ni olish va polling boshlash
  const botService = app.get(BotService);

  // Server ishga tushirish
  const port = process.env.PORT || 3004;
  await app.listen(port);
  console.log(`🚀 Bot server ishlamoqda - ${port}-portda`);
  console.log(`📱 Telegram bot tayyor: @yoldauz_yukbot`);
  console.log(`🎛️ Dashboard: http://localhost:${port}/dashboard`);
}
bootstrap();