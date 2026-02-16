import { Logger, VersioningType, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app/app.module';
import { GlobalHttpExceptionFilter } from '@pivota-api/filters';
import { LoggingInterceptor, TimeoutInterceptor, TransformInterceptor } from '@pivota-api/interceptors';

// Load environment variables (.env.dev, .env.production etc.)
dotenv.config({ path: `.env.${process.env.NODE_ENV || 'dev'}` });

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  logger.log('⏳ Starting API Gateway initialization...');

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  logger.log('✅ Nest application instance created');

  // -----------------------------
  // 1️⃣ Global ValidationPipe
  // -----------------------------
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  logger.log('✅ Global ValidationPipe enabled');

  // -----------------------------
  // 2️⃣ API Versioning
  // -----------------------------
  app.enableVersioning({ type: VersioningType.URI });
  logger.log('✅ API versioning enabled (URI-based)');

  const configService = app.get(ConfigService);

  // -----------------------------
  // 3️⃣ Global Prefix
  // -----------------------------
  const globalPrefix = configService.get<string>('API_PREFIX') || 'api';
  app.setGlobalPrefix(globalPrefix);
  logger.log(`📚 Global API prefix set to: /${globalPrefix}`);

  // -----------------------------
  // 4️⃣ Security & Middleware
  // -----------------------------
  app.use(helmet());
  logger.log('🔐 Helmet security headers enabled');

  app.use(compression());
  logger.log('⚡ Response compression enabled');

  app.use(cookieParser());
  logger.log('🍪 Cookie parser enabled');

  app.enableCors({
    origin: true,
    credentials: true,
  });
  logger.log('🌐 CORS enabled');

  // Optional: Limit request body size
  app.use((req, res, next) => {
    req.setTimeout(30000); // 30s timeout
    next();
  });

  // Optional: Rate limiting
  app.use(
    rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 100,                 // limit each IP to 100 requests per windowMs
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
  logger.log('⛑️ Rate limiting enabled');

  // -----------------------------
  // 5️⃣ Global Exception Filter
  // -----------------------------
  app.useGlobalFilters(new GlobalHttpExceptionFilter());
  logger.log('🚨 Global exception filter registered');

  // -----------------------------
  // 6️⃣ Global Interceptors
  // -----------------------------
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
    new TimeoutInterceptor(),
  );
  logger.log('🌀 Global interceptors registered');

  app.enableShutdownHooks();
  logger.log('🔌 Graceful shutdown hooks enabled');

  // -----------------------------
  // 7️⃣ Swagger Integration
  // -----------------------------
  const swaggerConfig = new DocumentBuilder()
    .setTitle('PivotaConnect API Documentation')
    .setDescription('Comprehensive documentation for all Pivota services')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const swaggerOptions = {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  };

  const documentFactory = () =>
    SwaggerModule.createDocument(app, swaggerConfig, swaggerOptions);

  SwaggerModule.setup('api', app, documentFactory, {
    explorer: true,
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'Pivota API Docs',
  });

  logger.log(`📖 Swagger docs available at http://localhost:${configService.get<number>('API_GATEWAY_PORT') || 3000}/api`);

  // -----------------------------
  // 8️⃣ Start Server
  // -----------------------------
  const port = configService.get<number>('API_GATEWAY_PORT') || 3000;
  await app.listen(port);
  logger.log(`🚀 API Gateway running at http://localhost:${port}/${globalPrefix}`);
}

bootstrap();
