/**
 * User Microservice (Kafka + gRPC + RabbitMQ)
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import * as dotenv from 'dotenv';
import { AppModule } from './app/app.module';
import { PROFILE_PROTO_PATH } from '@pivota-api/protos';

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
  Logger.log(`DATABASE_URL (via ConfigService) = ${configService.get<string>('PROFILE_SERVICE_DATABASE_URL')}`);
  Logger.log(`JWT_SECRET (via ConfigService) = ${configService.get<string>('JWT_SECRET')}`);
  Logger.log(`RABBITMQ_URL (via ConfigService) = ${configService.get<string>('RABBITMQ_URL')}`);

  // ---------------- Kafka Microservice - GENERAL EVENTS (Consumer) ----------------
  // For general events that the profile service needs to consume
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'profile-service-general',
        brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      },
      consumer: {
        groupId: 'profile-service-consumer-v2',
      },
      subscribe: { fromBeginning: false },
    },
  });

  // ---------------- Kafka Microservice - STORAGE EVENTS (Consumer) ----------------
  // For consuming file deletion events from storage service
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'profile-service-storage',
        brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      },
      consumer: {
        groupId: 'profile-service-storage-consumer',
      },
      subscribe: { fromBeginning: false },
    },
  });

  // ---------------- Kafka Microservice - ANALYTICS EVENTS (Producer Only) ----------------
  // Note: This is a producer-only client for emitting analytics events
  // No consumer group needed - configured in ProfileModule with producerOnlyMode: true

  // ---------------- gRPC Microservice ----------------
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'profile', // must match proto package
      protoPath: PROFILE_PROTO_PATH,
      url: process.env.PROFILE_GRPC_URL || '0.0.0.0:50052',
    },
  });

  // ---------------- RabbitMQ Microservice ----------------
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
      queue: 'profile_service_queue', // specific queue for profile service
      queueOptions: {
        durable: true,
      },
      noAck: false, // safer: requires explicit ack in handlers
    },
  });

  await app.startAllMicroservices();
  
  Logger.log(`🚀 Profile service is running (Kafka + gRPC + RabbitMQ)`);
  Logger.log(`✅ Kafka General Consumer connected to ${process.env.KAFKA_BROKERS || 'localhost:9092'} (groupId: profile-service-consumer-v2)`);
  Logger.log(`✅ Kafka Storage Consumer connected to ${process.env.KAFKA_BROKERS || 'localhost:9092'} (groupId: profile-service-storage-consumer)`);
  Logger.log(`✅ Kafka Analytics Producer ready for emitting events`);
  Logger.log(`✅ gRPC listening on ${process.env.PROFILE_GRPC_URL || '0.0.0.0:50052'}`);
  Logger.log(`✅ RabbitMQ connected to ${process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'}`);
}

bootstrap();