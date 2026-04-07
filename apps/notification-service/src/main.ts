// apps/notification-service/src/main.ts
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { AppModule } from './app/app.module';

dotenv.config();

async function bootstrap() {
  console.log('🔴 STEP 1: Starting notification service bootstrap...');
  
  const logger = new Logger('NotificationServiceBootstrap');
  console.log('🔴 STEP 2: Logger created');
  
  const app = await NestFactory.create(AppModule);
  console.log('🔴 STEP 3: Nest app created');
  
  console.log('🔴 STEP 4: Connecting to RabbitMQ at:', process.env.RMQ_URL || 'amqp://localhost:5672');

  // RabbitMQ connection for auth-related emails
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RMQ_URL || 'amqp://localhost:5672'],
      queue: 'notification_email_queue',
      noAck: false,
      prefetchCount: 1,
      queueOptions: { 
        durable: true
      },
    },
  }, { inheritAppConfig: true });
  
  console.log('🔴 STEP 5: Auth email microservice connected');

  // RabbitMQ connection for housing-related emails
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
      queue: 'housing_notification_queue',
      noAck: false,
      prefetchCount: 1,
      queueOptions: { 
        durable: true,
        autoDelete: false,
        arguments: {
          'x-queue-type': 'classic',
          'x-message-ttl': 600000,
        }
      },
    }, 
  }, { inheritAppConfig: true });
  
  console.log('🔴 STEP 6: Housing email microservice connected');

  await app.startAllMicroservices();
  console.log('🔴 STEP 7: All microservices started');
  
  logger.log('🚀 Notification Microservice is running');
  logger.log(`✅ RabbitMQ listening on queue: notification_email_queue`);
  logger.log(`✅ RabbitMQ listening on queue: housing_notification_queue`);
  logger.log(`⚠️ Kafka is DISABLED (only RabbitMQ for emails)`);
  
  console.log('🔴 STEP 8: Bootstrap complete - service is ready');
}

bootstrap();