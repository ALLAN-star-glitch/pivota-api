import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app/app.module';
import * as dotenv from 'dotenv';
import { AUTH_PROTO_PATH } from '@pivota-api/protos';

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
        groupId: 'auth-service-consumer',  // ✅ Use a consistent group ID
      },
      subscribe: { 
        fromBeginning: true  // ✅ Set to true to catch events
      },
    },
  });

  // ------------------- gRPC Microservice -------------------
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'auth',
      protoPath: AUTH_PROTO_PATH,
      url: process.env.AUTH_GRPC_URL || '0.0.0.0:50051',
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
      noAck: false,  // ✅ Set to false for manual acknowledgment
    },
  });

  await app.startAllMicroservices();
  logger.log('🚀 Auth service is running (Kafka + gRPC + RabbitMQ)');
}

bootstrap();