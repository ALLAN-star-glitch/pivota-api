import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app/app.module';
import * as dotenv from 'dotenv';
import { AUTH_PROTO_PATH } from '@pivota-api/protos';

// Load environment file based on NODE_ENV
dotenv.config({
  path: `.env.${process.env.NODE_ENV || 'dev'}`,
});

async function bootstrap() {
  const logger = new Logger('AuthBootstrap');

  // Validate critical env variables early
  const GRPC_URL = process.env.AUTH_GRPC_URL || '0.0.0.0:50051';
  const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
  const RMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

  logger.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  logger.log(`gRPC URL: ${GRPC_URL}`);
  logger.log(`Kafka Brokers: ${KAFKA_BROKERS.join(', ')}`);
  logger.log(`RabbitMQ URL: ${RMQ_URL}`);

  // Create application (no HTTP server exposed)
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // ---------------- Kafka ----------------
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: KAFKA_BROKERS,
      },
      consumer: {
        groupId: 'auth-service-consumer',
      },
      subscribe: { fromBeginning: false },
    },
  });

  // ---------------- gRPC (CRITICAL) ----------------
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'auth',
      protoPath: AUTH_PROTO_PATH,
      url: GRPC_URL,
    },
  });

  // ---------------- RabbitMQ ----------------
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [RMQ_URL],
      queue: 'auth_service_queue',
      queueOptions: {
        durable: true,
      },
      noAck: false, // safer for reliability
    },
  });

  // Start microservices
  await app.startAllMicroservices();

  logger.log('🚀 Auth Microservices Started');
  logger.log('📡 gRPC ready on ' + GRPC_URL);
  logger.log('📨 Kafka consumer active');
  logger.log('🐇 RabbitMQ connected');

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    logger.warn(`Received ${signal}. Shutting down auth service...`);
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap();
