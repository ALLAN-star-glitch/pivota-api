// main.ts
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { AppModule } from './app/app.module';

dotenv.config();

async function bootstrap() {
  const logger = new Logger('NotificationServiceBootstrap');
  const app = await NestFactory.create(AppModule);

  //  Global Validation (Crucial for DTOs to work in the Controller)
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  
  /// One single RMQ connection for ALL emails
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RMQ_URL || 'amqp://localhost:5672'],
      queue: 'notification_email_queue', // Everything (Login & Onboarding) comes here
      noAck: false,
      prefetchCount: 1, // Process 1 email at a time per worker
      queueOptions: { durable: true },
    },
  }, { inheritAppConfig: true });


  //  Kafka microservice (For other events)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: { 
        brokers: (process.env.KAFKA_BROKER || 'localhost:9092').split(',') 
      },
      consumer: { 
        groupId: process.env.KAFKA_CONSUMER_NOTIFICATION_GROUP || 'notification-group' 
      },
    },
  });

  await app.startAllMicroservices();
  
  logger.log('🚀 Notification Microservice is running');
  logger.log(`✅ RabbitMQ listening on queue: notification_email_queue`);
  logger.log(`✅ Kafka group: ${process.env.KAFKA_CONSUMER_NOTIFICATION_GROUP || 'notification-group'}`);
}

bootstrap();