/**
 * Admin Service Bootstrap
 * -----------------------
 * Handles RBAC, subscriptions, categories, auditing.
 * Communicates via gRPC (API Gateway), Kafka (events), and RabbitMQ (task queues).
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { RBAC_PROTO_PATH } from '@pivota-api/protos';


async function bootstrap() {
  const logger = new Logger('AdminServiceBootstrap');

  const app = await NestFactory.create(AppModule);

  // -------------------------------
  // gRPC Microservice (RBAC module)
  // -------------------------------
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'rbac',
      protoPath: RBAC_PROTO_PATH,
      url: process.env.RBAC_GRPC_URL || '0.0.0.0:5005',
    },
  });

  // -------------------------------
  // Kafka Microservice (Events)
  // -------------------------------
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'admin-service',
        brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      },
      consumer: {
        groupId: 'admin-service-consumer',
      },
    },
  });

  // -------------------------------
  // RabbitMQ Microservice (Tasks/Queues)
  // -------------------------------
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RMQ_URL || 'amqp://localhost:5672'],
      queue: process.env.RMQ_QUEUE || 'admin_service_queue',
      queueOptions: {
        durable: true,
      },
    },
  });

  // Start all microservices
  await app.startAllMicroservices();

  logger.log(`🚀 Admin service is running`);
  logger.log(`✅ gRPC listening on ${process.env.RBAC_GRPC_URL || '0.0.0.0:50055'}`);
  logger.log(`✅ Kafka connected to ${process.env.KAFKA_BROKERS || 'localhost:9092'}`);
  logger.log(`✅ RabbitMQ queue: ${process.env.RMQ_QUEUE || 'admin_service_queue'}`);
}

bootstrap();
