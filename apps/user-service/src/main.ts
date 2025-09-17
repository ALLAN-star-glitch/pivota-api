/**
 * User Microservice (Kafka + gRPC)
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import * as dotenv from 'dotenv';
import { AppModule } from './app/app.module';
import { USER_PROTO_PATH } from '@pivota-api/protos'; // adjust if path differs


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

  await app.startAllMicroservices();
  Logger.log(`🚀 User service (Kafka + gRPC) is running...`);
}

bootstrap();
