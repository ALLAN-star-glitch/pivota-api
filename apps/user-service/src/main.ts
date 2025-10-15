/**
 * User Microservice (Kafka + gRPC + RabbitMQ)
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import * as dotenv from 'dotenv';
import { AppModule } from './app/app.module';
import { USER_PROTO_PATH } from '@pivota-api/protos';

// Load environment explicitly
dotenv.config({ path: `.env.${process.env.NODE_ENV || 'dev'}` });

async function bootstrap() {
  Logger.log(`NODE_ENV = ${process.env.NODE_ENV}`);
  Logger.log(`KAFKA_BROKERS = ${process.env.KAFKA_BROKERS}`);

  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Log values via ConfigService
  Logger.log(`NODE_ENV (via ConfigService) = ${configService.get<string>('NODE_ENV')}`);
  Logger.log(`KAFKA_BROKERS (via ConfigService) = ${configService.get<string>('KAFKA_BROKERS')}`);
  Logger.log(`DATABASE_URL (via ConfigService) = ${configService.get<string>('USER_SERVICE_DATABASE_URL')}`);
  Logger.log(`JWT_SECRET (via ConfigService) = ${configService.get<string>('JWT_SECRET')}`);
  Logger.log(`RABBITMQ_URL (via ConfigService) = ${configService.get<string>('RABBITMQ_URL')}`);

  // ---------------- Kafka Microservice ----------------
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      },
      consumer: {
        groupId: 'user-service-consumer-v2',
      },
      subscribe: { fromBeginning: false },
    },
  });

  // ---------------- gRPC Microservice ----------------
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'user', // must match proto package
      protoPath: USER_PROTO_PATH,
      url: process.env.USER_GRPC_URL || '0.0.0.0:50052',
    },
  });

  // ---------------- RabbitMQ Microservice ----------------
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
      queue: 'user_service_queue', // specific queue for user service
      queueOptions: {
        durable: true,
      },
      noAck: false, // safer: requires explicit ack in handlers
    },
  });

  await app.startAllMicroservices();
  Logger.log(`🚀 User service is running (Kafka + gRPC + RabbitMQ)`);
  Logger.log(`✅ Kafka connected to ${process.env.KAFKA_BROKERS} || 'localhost:9092'`);
  Logger.log(`✅ gRPC listening on ${process.env.USER_GRPC_URL || ' 0.0.0.0:50052'}`);



}

bootstrap();