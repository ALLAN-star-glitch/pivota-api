import { Logger, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import * as dotenv from 'dotenv';

// 🔹 Load env file explicitly (optional but helps Nx)
dotenv.config({ path: `.env.${process.env.NODE_ENV || 'dev'}` });

async function bootstrap() {
  // Log process.env before app creation
  Logger.log(`NODE_ENV = ${process.env.NODE_ENV}`);
  Logger.log(`KAFKA_BROKERS (from process.env) = ${process.env.KAFKA_BROKERS}`);

  const app = await NestFactory.create(AppModule);

  // Config service
  const configService = app.get(ConfigService);

  // Log values via ConfigService
  Logger.log(`NODE_ENV (via ConfigService) = ${configService.get<string>('NODE_ENV')}`);
  Logger.log(`KAFKA_BROKERS (via ConfigService) = ${configService.get<string>('KAFKA_BROKERS')}`);

  // Setting up the global prefix
  const globalPrefix = configService.get<string>('GLOBAL_PREFIX_AUTH_SERVICE');
  if (globalPrefix) {
    app.setGlobalPrefix(globalPrefix);
  }

  app.enableVersioning({ type: VersioningType.URI });

  // Kafka microservice setup
  const kafkaBrokers = configService.get<string>('KAFKA_BROKERS')?.split(',') || ['localhost:9092'];

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: { brokers: kafkaBrokers },
      consumer: { groupId: 'auth-service-consumer' },
    },
  });

  await app.startAllMicroservices();

  Logger.log(`🎧 Kafka consumer running on brokers: ${kafkaBrokers.join(', ')}`);

  const port = configService.get<number>('AUTH_SERVICE_PORT') || 3000;
  await app.listen(port);

  Logger.log(`🚀 Application running on: http://localhost:${port}/${globalPrefix}`);
  Logger.log(`🎧 Kafka consumer running on brokers: ${kafkaBrokers.join(', ')}`);
}

bootstrap();
