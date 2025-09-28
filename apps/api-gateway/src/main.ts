import { Logger, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { AppModule } from './app/app.module';

// Load environment variables
dotenv.config({ path: `.env.${process.env.NODE_ENV || 'dev'}` });

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  logger.log('🔄 Starting API Gateway...');

  const app = await NestFactory.create(AppModule);
  logger.log('✅ Nest application instance created');

  app.enableVersioning({ type: VersioningType.URI });
  logger.log('🔖 API versioning enabled (URI-based)');

  const configService = app.get(ConfigService);


  app.use(cookieParser());
  logger.log('🍪 Cookie parser enabled');

  app.enableCors({
    origin: true,
    credentials: true,
  });
  logger.log('🌍 CORS enabled');

  const port = configService.get<number>('API_GATEWAY_PORT') || 3000;
  await app.listen(port);
  logger.log(`🚀 API Gateway running at http://localhost:${port}`);
}

bootstrap();
