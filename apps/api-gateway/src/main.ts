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

  app.enableVersioning({ type: VersioningType.URI });
  logger.log(' API versioning enabled (URI-based)');

  const configService = app.get(ConfigService);

  const globalPrefix = configService.get<string>('API_PREFIX') || '';
  app.setGlobalPrefix(globalPrefix);
  logger.log(`📚 Global API prefix set to: /${globalPrefix}`);

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
    
    // ===========================================================
    // MAIN MODULE TAGS
    // ===========================================================
    .addTag('Housing', 'All housing-related endpoints')
    .addTag('Jobs', 'All job-related endpoints')
    .addTag('Auth', 'Authentication endpoints')
    .addTag('User Profile', 'User profile management')
    .addTag('Organisation', 'Organization management')
    .addTag('Contractors', 'Service provider management')
    .addTag('Contractors - Pricing', 'Contractor pricing and validation rules')
    .addTag('RBAC', 'Role-Based Access Control')
    .addTag('Plans', 'Subscription plans')
    .addTag('Subscriptions', 'User subscriptions')
    .addTag('Registry', 'Cross-vertical listing registry')
    .addTag('Categories', 'Category management')
    .addTag('Auth - Development Tools', 'Development utilities for testing')
    
    // ===========================================================
    // HOUSING SUBTAGS
    // ===========================================================
    .addTag('Housing - Discovery', 'Public endpoints for searching and viewing house listings')
    .addTag('Housing - Management', 'Create, update, and manage your own listings')
    .addTag('Housing - Admin', 'Administrative controls for all housing data')
     
    // ===========================================================
    // JOBS SUBTAGS
    // ===========================================================
    .addTag('Jobs - Management', 'Create, update, and manage your job postings')
    .addTag('Jobs - Applications', 'Submit and track job applications')
    .addTag('Jobs - Admin', 'Administrative controls for all job data')
    .addTag('Jobs - Public', 'Public job search and discovery')
    
    // ===========================================================
    // AUTH SUBTAGS
    // ===========================================================
    .addTag('Auth - Registration', 'User and organization registration')
    .addTag('Auth - Login', 'Authentication endpoints')
    .addTag('Auth - OTP', 'One-time password verification')
    .addTag('Auth - Password', 'Password management')
    .addTag('Auth - Sessions', 'Session management')
    .addTag('Auth - Tokens', 'Token refresh and management')
    .addTag('Auth - Dev Tools', 'Development authentication tools')
    
    // ===========================================================
    // USER PROFILE SUBTAGS
    // ===========================================================
    .addTag('Profile - My Profile', 'Manage your own profile')
    .addTag('Profile - Admin', 'Administrative profile management')
    .addTag('Profile - Provider', 'Service provider profiles')
    .addTag('Profile - Job Seeker', 'Job seeker profiles')
    
    // ===========================================================
    // ORGANISATION SUBTAGS
    // ===========================================================
    .addTag('Organisation - Profile', 'Organization details')
    .addTag('Organisation - Team', 'Team member management')
    .addTag('Organisation - Invitations', 'Invitation management')
    .addTag('Organisation - Provider', 'Organization provider onboarding')
    .addTag('Organisation - Discovery', 'Organization discovery and filtering')
    
    // ===========================================================
    // CONTRACTORS SUBTAGS
    // ===========================================================
    .addTag('Contractors - Services', 'Create and manage service offerings')
    .addTag('Contractors - Discovery', 'Discover service providers')
    .addTag('Contractors - Pricing', 'Pricing metadata and validation rules')
    .addTag('Contractors - Pricing Admin', 'Administrative pricing rule management')
    
    // ===========================================================
    // RBAC SUBTAGS
    // ===========================================================
    .addTag('RBAC - Roles', 'Role management')
    .addTag('RBAC - Permissions', 'Permission management')
    .addTag('RBAC - Assignments', 'Role assignments')
    
    // ===========================================================
    // PLANS SUBTAGS
    // ===========================================================
    .addTag('Plans - Public', 'View available plans')
    .addTag('Plans - Admin', 'Plan management')
    
    // ===========================================================
    // SUBSCRIPTIONS SUBTAGS
    // ===========================================================
    .addTag('Subscriptions - Management', 'Manage subscriptions')
    .addTag('Subscriptions - Access', 'Check module access')
    
    // ===========================================================
    // REGISTRY SUBTAGS
    // ===========================================================
    .addTag('Registry - My Portfolio', 'View your listings across all verticals')
    .addTag('Registry - Admin', 'Administrative registry')
    
    // ===========================================================
    // CATEGORIES SUBTAGS
    // ===========================================================
    .addTag('Categories - Public', 'Public category discovery')
    .addTag('Categories - Admin', 'Category management')
    
    .build();
 
  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
    ignoreGlobalPrefix: true,
  });

  SwaggerModule.setup('api', app, document, {
    explorer: true,
    swaggerOptions: {
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'Pivota API Docs',
  });

  logger.log(`📖 Swagger docs available at http://localhost:${configService.get<number>('API_GATEWAY_PORT') || 3000}/api`);

  const port = configService.get<number>('API_GATEWAY_PORT') || 3000;
  await app.listen(port);
  logger.log(`🚀 API Gateway running at http://localhost:${port}${globalPrefix ? '/' + globalPrefix : ''}`);
}
 
bootstrap();