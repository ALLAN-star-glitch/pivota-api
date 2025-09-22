import { Logger, VersioningType } from '@nestjs/common'; import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import { AppModule } from './app/app.module';

// Load environment
dotenv.config({ path: `.env.${process.env.NODE_ENV || 'dev'}` });

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // ✅ URL-based versioning
  app.enableVersioning({ type: VersioningType.URI });

  const configService = app.get(ConfigService);

  // ✅ Use "api" as prefix
  const globalPrefix = configService.get<string>('GLOBAL_PREFIX_API_GATEWAY') || 'api';
  app.setGlobalPrefix(globalPrefix);

  const port = configService.get<number>('API_GATEWAY_PORT') || 3000;
  await app.listen(port);

  logger.log(`🚀 API Gateway running at http://localhost:${port}/${globalPrefix}`);
}

bootstrap();
