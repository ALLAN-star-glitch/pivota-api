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

// Load environment variables explicitly
dotenv.config({ path: `.env.${process.env.NODE_ENV || 'dev'}` });

async function bootstrap() {
  const logger = new Logger('ProfileServiceBootstrap');

  logger.log(`NODE_ENV = ${process.env.NODE_ENV || 'dev'}`);

  // ---------------- Create Nest App ----------------
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // ---------------- Log Config ----------------
  const kafkaBrokers = configService.get<string>('KAFKA_BROKERS') || process.env.KAFKA_BROKERS || 'localhost:9092';
  const grpcUrl = configService.get<string>('PROFILE_GRPC_URL') || process.env.PROFILE_GRPC_URL || '0.0.0.0:50052';
  const rabbitmqUrl = configService.get<string>('RABBITMQ_URL') || process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

  logger.log(`KAFKA_BROKERS = ${kafkaBrokers}`);
  logger.log(`PROFILE_GRPC_URL = ${grpcUrl}`);
  logger.log(`RABBITMQ_URL = ${rabbitmqUrl}`);
  logger.log(`DATABASE_URL = ${configService.get<string>('PROFILE_SERVICE_DATABASE_URL')}`);
  logger.log(`JWT_SECRET = ${configService.get<string>('JWT_SECRET')}`);

  // ---------------- Kafka Microservice ----------------
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: kafkaBrokers.split(','),
      },
      consumer: {
        groupId: 'profile-service-consumer-v2',
      },
      subscribe: { fromBeginning: false },
    },
  });
  logger.log(`✅ Kafka microservice configured`);

  // ---------------- gRPC Microservice ----------------
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'profile', // must match proto package
      protoPath: PROFILE_PROTO_PATH,
      url: grpcUrl,
    },
  });
  logger.log(`✅ gRPC microservice configured at ${grpcUrl}`);

  // ---------------- RabbitMQ Microservice ----------------
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUrl],
      queue: 'profile_service_queue',
      queueOptions: {
        durable: true,
      },
      noAck: false, // requires explicit acknowledgment
    },
  });
  logger.log(`✅ RabbitMQ microservice configured at ${rabbitmqUrl}`);

  // ---------------- Start all microservices ----------------
  try {
    await app.startAllMicroservices();
    logger.log(`🚀 All microservices (Kafka + gRPC + RabbitMQ) started successfully`);
  } catch (err) {
    logger.error(`❌ Failed to start microservices: ${err.message}`, err.stack);
    process.exit(1);
  }

  // ---------------- Optional: Start HTTP (REST) server ----------------
  const port = configService.get<number>('PROFILE_SERVICE_PORT') || 3000;
  await app.listen(port);
  logger.log(`🌐 REST API listening on http://localhost:${port}`);
}

bootstrap();
