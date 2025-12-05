/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { LISTINGS_PROTO_PATH } from '@pivota-api/protos';
import * as dotenv from 'dotenv'

// Load environment
dotenv.config({ path: `.env.${process.env.NODE_ENV || 'dev'}` });

async function bootstrap() {

  const logger = new Logger('ListingsServiceBootstrap')

  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({

    transport: Transport.GRPC,
    options: {
      package: 'categories',
      protoPath: LISTINGS_PROTO_PATH,
      url: process.env.LISTINGS_GRPC_URL || '0.0.0.0:50056'

    }
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'notification-service',
        brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      },
      consumer: {
      groupId: 'notification-service-consumer'
    },
    },

  }
);

await app.startAllMicroservices();

 logger.log(`🚀 Listings service is running`);
  logger.log(`✅ gRPC listening on ${process.env.RBAC_GRPC_URL || '0.0.0.0:50056'}`);
  logger.log(`✅ Kafka connected to ${process.env.KAFKA_BROKERS || 'localhost:9092'}`);

}
  

bootstrap();
