import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Bật graceful shutdown hooks
  app.enableShutdownHooks();

  // Bật CORS cho phép kết nối từ frontend
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  // Validation pipe toàn cục
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`BrewLite API is running on http://localhost:${port}`);
}

bootstrap();

