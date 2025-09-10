import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // CORS ni yoqish
  app.enableCors();
  
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Server ishlamoqda: http://localhost:${port}`);
  console.log(`📱 Web app: http://localhost:${port}/webapp`);
}
bootstrap();