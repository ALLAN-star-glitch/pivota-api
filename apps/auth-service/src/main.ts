import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions, ClientKafka } from '@nestjs/microservices';
import { AppModule } from './app/app.module';
import * as dotenv from 'dotenv';
import { AUTH_PROTO_PATH } from '@pivota-api/protos';
import { firstValueFrom } from 'rxjs';

// Load environment
dotenv.config({ path: `.env.${process.env.NODE_ENV || 'dev'}` });

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule);

  logger.log(`NODE_ENV = ${process.env.NODE_ENV}`);
  logger.log(`KAFKA_BROKERS = ${process.env.KAFKA_BROKERS}`);

  // ------------------- Kafka Client -------------------
  const kafkaClient = app.get<ClientKafka>('USER_SERVICE'); // make sure this token matches your injection
  kafkaClient.subscribeToResponseOf('user.create');
  kafkaClient.subscribeToResponseOf('user.getByEmail');
  kafkaClient.subscribeToResponseOf('user.getById');
  kafkaClient.subscribeToResponseOf('health.check');

  await kafkaClient.connect();
  logger.log('✅ Kafka client connected (from main.ts)');

  // optional test ping
  try {
      const testResponse = await firstValueFrom(
      kafkaClient.send('health.check', { message: 'ping' })
    );
    logger.log('Test message response:', testResponse);
  } catch (err) {
    logger.error('Kafka test ping failed', err);
  }

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
