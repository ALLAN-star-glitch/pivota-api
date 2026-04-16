import { Logger, VersioningType, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app/app.module';
import { GlobalHttpExceptionFilter } from '@pivota-api/filters';
import { LoggingInterceptor, TimeoutInterceptor, TransformInterceptor } from '@pivota-api/interceptors';

// Load environment variables
dotenv.config({ path: `.env.${process.env.NODE_ENV || 'dev'}` });

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  logger.log(' Starting API Gateway...');

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  logger.log(' Nest application instance created');

  // -----------------------------
  // 1️⃣ Enable Validation Pipe
  // -----------------------------
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  logger.log(' ✅ Global ValidationPipe enabled');

  // Versioning is now the primary path segment (e.g., /v1/auth)
  app.enableVersioning({ type: VersioningType.URI });
  logger.log(' API versioning enabled (URI-based)');

  const configService = app.get(ConfigService);

  // --- GLOBAL PREFIX REMOVED FROM HERE ---

  app.use(helmet());
  logger.log(' Helmet enabled');

  app.use(compression());
  logger.log('⚡ Compression enabled');

  app.use(cookieParser());
  logger.log(' Cookie parser enabled');

  app.enableCors({
    origin: true,
    credentials: true,
  });
  logger.log(' CORS enabled');

  app.useGlobalFilters(new GlobalHttpExceptionFilter());
  logger.log(' GlobalHttpExceptionFilter registered');

  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
    new TimeoutInterceptor()
  );

  app.enableShutdownHooks();
  logger.log('🔌 Shutdown hooks enabled');

  // ========================
  // Swagger integration start
  // ========================
  const swaggerConfig = new DocumentBuilder()
    .setTitle('PivotaConnect API Documentation')
    .setDescription('Complete API documentation for all PivotaConnect microservices')
    .setVersion('1.0')
    /* ... (Tags remain the same) ... */
    .build();
 
  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
    // Since there is no global prefix, this is technically redundant but safe to keep
    ignoreGlobalPrefix: true, 
  });

  // Swagger is accessible at /api
  SwaggerModule.setup('', app, document, { 
  explorer: true,
  swaggerOptions: {
    tagsSorter: 'alpha', 
    operationsSorter: 'alpha',
  },
  customSiteTitle: 'Pivota API Docs',
});

 const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get('/api-json', (req, res) => {
    res.json(document);
  });
  logger.log('📄 OpenAPI JSON available at /api-json');

  const port = configService.get<number>('API_GATEWAY_PORT') || 3000;
  
  logger.log(`📖 Swagger docs available at http://localhost:${port}`);

  await app.listen(port);
  logger.log(`🚀 API Gateway running at http://localhost:${port}`);
}

bootstrap();