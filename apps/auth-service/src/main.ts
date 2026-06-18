import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app/app.module';
import * as dotenv from 'dotenv';
import { 
  AUTHENTICATION_PROTO_PATH,
  ONBOARDING_PROTO_PATH 
} from '@pivota-api/protos';
import { QueueService } from '@pivota-api/shared-redis';

// Load environment
dotenv.config({ path: `.env.${process.env.NODE_ENV || 'dev'}` });

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule);

  logger.log(`NODE_ENV = ${process.env.NODE_ENV}`);
  logger.log(`KAFKA_BROKERS = ${process.env.KAFKA_BROKERS}`);
  logger.log(`RABBITMQ_URL = ${process.env.RABBITMQ_URL}`);

  app.enableShutdownHooks();

  // ------------------- Kafka Microservice -------------------
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
        clientId: 'auth-service',
      },
      consumer: {
        groupId: 'auth-service-consumer',
      },
      subscribe: { 
        fromBeginning: true
      },
    },
  });

  // ------------------- gRPC Microservice -------------------

  // ✅ NEW: Authentication gRPC Service
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'authentication',
      protoPath: AUTHENTICATION_PROTO_PATH,
      url: process.env.AUTH_GRPC_URL || '0.0.0.0:50099',  // ✅ Different port
    },
  });

  // ✅ NEW: Onboarding gRPC Service
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'onboarding',
      protoPath: ONBOARDING_PROTO_PATH,
      url: process.env.ONBOARDING_GRPC_URL || '0.0.0.0:50092',  // ✅ Different port
    },
  });

  // ------------------- RabbitMQ Microservice -------------------
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
      queue: 'auth_service_queue',
      queueOptions: {
        durable: true,
      },
      noAck: false,
    },
  });

  // ✅ CRITICAL: Pre-create queues BEFORE starting microservices
  const queueService = app.get(QueueService);
  await queueService.onModuleInit();
  logger.log('✅ Queues pre-created');

  await app.startAllMicroservices();
  logger.log('🚀 Auth service is running (Kafka + gRPC + RabbitMQ)');
  logger.log(`📦 gRPC Services:`);
  logger.log(`   - authentication: ${process.env.AUTH_GRPC_URL || '0.0.0.0:50091'}`);
  logger.log(`   - onboarding: ${process.env.ONBOARDING_GRPC_URL || '0.0.0.0:50092'}`);
}

bootstrap();