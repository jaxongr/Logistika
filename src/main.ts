import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BotService } from './bot/bot.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // CORS ni yoqish
  app.enableCors();
  
  // BotService ni olish va polling boshlash
  const botService = app.get(BotService);
  
  // Server ishga tushirish
  const port = process.env.PORT || 3003;
  await app.listen(port);
  console.log(`🚀 Bot server ishlamoqda - ${port}-portda`);
  console.log(`📱 Telegram bot tayyor: @yoldauz_yukbot`);
  
  // Polling qo'lda boshlash (agar avtomatik boshlanmasa)
  setTimeout(() => {
    console.log('🔄 Manual polling start...');
  }, 2000);
}
bootstrap();