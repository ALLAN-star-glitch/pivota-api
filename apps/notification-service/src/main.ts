// apps/notification-service/src/main.ts
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { AppModule } from './app/app.module';

dotenv.config();

async function bootstrap() {
  console.log('🔴 STEP 1: Starting notification service bootstrap...');
  
  const logger = new Logger('NotificationServiceBootstrap');
  console.log('🔴 STEP 2: Logger created');
  
  const app = await NestFactory.create(AppModule);
  console.log('🔴 STEP 3: Nest app created');
  
  const rmqUrl = process.env.RMQ_URL || process.env.RABBITMQ_URL || 'amqp://localhost:5672';
  console.log('🔴 STEP 4: Connecting to RabbitMQ at:', rmqUrl);

  // RabbitMQ connection for auth-related emails
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rmqUrl],
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
    urls: [rmqUrl],
    queue: 'housing_notification_queue',
    noAck: false,
    prefetchCount: 1,
    queueOptions: {  
      durable: true,
      autoDelete: false,
      arguments: {
        'x-message-ttl': 600000, // 10 minutes TTL
      }
    }, 
  },  
}, { inheritAppConfig: true });
  
  console.log('🔴 STEP 6: Housing email microservice connected');

  // RabbitMQ connection for booking-related emails
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rmqUrl],
      queue: 'booking_notification_queue',
      noAck: false,
      prefetchCount: 1,
    }, 
  }, { inheritAppConfig: true });
  
  console.log('🔴 STEP 7: Booking email microservice connected');

  // RabbitMQ connection for service execution-related emails (evidence upload)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rmqUrl],
      queue: 'service_execution_notification_queue',
      noAck: false,
      prefetchCount: 1,
      queueOptions: { 
        durable: true
      },
    }, 
  }, { inheritAppConfig: true });
  
  console.log('🔴 STEP 8: Service execution email microservice connected');

  // ============================================================
  // NEW: RabbitMQ connection for jobs-related emails
  // REMOVED x-message-ttl to avoid conflict with existing queue
  // ============================================================
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rmqUrl],
      queue: 'jobs_notification_queue',
      noAck: false,
      prefetchCount: 1,
      queueOptions: { 
        durable: true,
        autoDelete: false,
      },
    }, 
  }, { inheritAppConfig: true });
  
  console.log('🔴 STEP 9: Jobs email microservice connected');

  // RabbitMQ connection for general notification events
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rmqUrl],
      queue: 'notification_events',
      noAck: false,
      prefetchCount: 1,
      queueOptions: { 
        durable: true,
        autoDelete: false,
      },
    }, 
  }, { inheritAppConfig: true });
  
  console.log('🔴 STEP 10: General notification events microservice connected');

  await app.startAllMicroservices();
  console.log('🔴 STEP 11: All microservices started');
  
  logger.log('🚀 Notification Microservice is running');
  logger.log(`✅ RabbitMQ listening on queue: notification_email_queue`);
  logger.log(`✅ RabbitMQ listening on queue: housing_notification_queue`);
  logger.log(`✅ RabbitMQ listening on queue: booking_notification_queue`);
  logger.log(`✅ RabbitMQ listening on queue: service_execution_notification_queue`);
  logger.log(`✅ RabbitMQ listening on queue: jobs_notification_queue`);
  logger.log(`✅ RabbitMQ listening on queue: notification_events`);
  logger.log(`⚠️ Kafka is DISABLED (only RabbitMQ for emails)`);
  
  console.log('🔴 STEP 12: Bootstrap complete - service is ready');
}

bootstrap();