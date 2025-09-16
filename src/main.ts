import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BotService } from './bot/bot.service';
import * as session from 'express-session';

async function bootstrap() {
  // Log level-ni kam qilish uchun
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn']  // Faqat error va warning log-lar
  });

  // CORS ni yoqish
  app.enableCors();

  // Session middleware qo'shish
  app.use(
    session({
      secret: 'yo_lda_admin_secret_key_2024',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 soat
        secure: false, // HTTPS uchun true qiling
        httpOnly: true
      }
    })
  );

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