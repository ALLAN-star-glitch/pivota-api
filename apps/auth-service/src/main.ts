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

  
  // ------------------- Kafka Microservice -------------------
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      },
      consumer: {
        groupId: 'auth-service-consumer-v2-new', // unique group ID
      },
      subscribe: { fromBeginning: false },
    },
  });

  // ------------------- gRPC Microservice -------------------
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'auth',
      protoPath: AUTH_PROTO_PATH,
      url: '0.0.0.0:50051',
    },
  });

  await app.startAllMicroservices();
  logger.log('🚀 Auth service is running (Kafka + gRPC)');
}

bootstrap();
