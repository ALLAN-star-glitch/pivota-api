import { Logger, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';

import { AppModule } from './app/app.module';
import { GlobalHttpExceptionFilter } from '@pivota-api/filters'; // adjust path

// Load environment variables
dotenv.config({ path: `.env.${process.env.NODE_ENV || 'dev'}` });

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  logger.log('🔄 Starting API Gateway...');

  // create app (express adapter required for cookie-parser)
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  logger.log('✅ Nest application instance created');

  // enable API versioning (URI)
  app.enableVersioning({ type: VersioningType.URI });
  logger.log('🔖 API versioning enabled (URI-based)');

  // get config service
  const configService = app.get(ConfigService);

  // global prefix
  const globalPrefix = configService.get<string>('API_PREFIX') || 'api';
  app.setGlobalPrefix(globalPrefix);
  logger.log(`📚 Global API prefix set to: /${globalPrefix}`);

  // middlewares
  app.use(helmet());
  logger.log('🛡️ Helmet enabled');

  app.use(compression());
  logger.log('⚡ Compression enabled');

  app.use(cookieParser());
  logger.log('🍪 Cookie parser enabled');

  app.enableCors({
    origin: true,
    credentials: true,
  });
  logger.log('🌍 CORS enabled');

  // Global exception filter only
  app.useGlobalFilters(new GlobalHttpExceptionFilter());
  logger.log('🧯 GlobalHttpExceptionFilter registered');

  // enable shutdown hooks
  app.enableShutdownHooks();
  logger.log('🔌 Shutdown hooks enabled');

  // start listening
  const port = configService.get<number>('API_GATEWAY_PORT') || 3000;
  await app.listen(port);
  logger.log(`🚀 API Gateway running at http://localhost:${port}/${globalPrefix}`);
}

bootstrap();
