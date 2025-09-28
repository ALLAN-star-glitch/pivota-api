// main.ts
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import * as dotenv from 'dotenv';
import { AppModule } from './app/app.module';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ RabbitMQ Microservice
  const rmqServer = app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://admin:7TX75zcT@rabbitmq-202760-0.cloudclusters.net:19996'],
      queue: process.env.RABBITMQ_NOTIFICATION_QUEUE || 'notification_queue',
      queueOptions: { durable: true },
    },
  });

  // 🔍 Listen to RabbitMQ connection status
  rmqServer.status.subscribe((status) => {
    console.log('🐰 [RMQ Server Status]', status);
  });

  rmqServer.on('error', (err) => {
    console.error('❌ [RMQ Server Error]', err.message);
  });

  // Kafka microservice
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: { brokers: [process.env.KAFKA_BROKER || 'localhost:9092'] },
      consumer: { groupId: process.env.KAFKA_CONSUMER_NOTIFICATION_GROUP || 'notification-group' },
    },
  });

  await app.startAllMicroservices();
  console.log('✅ Notification Microservice is listening for messages...');
}

bootstrap();
