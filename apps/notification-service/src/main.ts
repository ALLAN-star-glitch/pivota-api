// main.ts
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import { AppModule } from './app/app.module';
import { NotificationsRealtimeService } from './notifications/notifications-realtime.service';

dotenv.config();

async function bootstrap() {
  const logger = new Logger('NotificationServiceBootstrap');

  // Create NestJS app
  const app = await NestFactory.create(AppModule);

  // Configurable ports and service URLs
  const configPort = Number(process.env.NOTIFICATION_SERVICE_PORT || process.env.PORT || 3000);
  const rabbitMqUrl = process.env.RMQ_URL || process.env.RABBITMQ_URL || 'amqp://localhost:5672';
  const notificationQueue = process.env.NOTIFICATION_EMAIL_QUEUE || process.env.RABBITMQ_NOTIFICATION_QUEUE || 'notification_email_queue';
  const kafkaBrokers = (process.env.KAFKA_BROKER || 'localhost:9092').split(',');
  const kafkaGroup = process.env.KAFKA_CONSUMER_NOTIFICATION_GROUP || 'notification-group';

  // Global ValidationPipe for DTOs
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  // Optional: simple health check endpoint
  app.getHttpAdapter().get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'NotificationService' });
  });

  // -------------------------------
  // RabbitMQ Microservice
  // -------------------------------
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitMqUrl],
      queue: notificationQueue,
      noAck: false,
      prefetchCount: 1,
      queueOptions: { durable: true },
    },
  }, { inheritAppConfig: true });

  // -------------------------------
  // Kafka Microservice
  // -------------------------------
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: { brokers: kafkaBrokers },
      consumer: { groupId: kafkaGroup },
    },
  });

  // Start microservices
  await app.startAllMicroservices();
  await app.listen(configPort);

  // -------------------------------
  // WebSocket Setup
  // -------------------------------
  const wsServer = new WebSocketServer({
    server: app.getHttpServer(),
    path: '/ws/notifications',
  });

  const realtimeService = app.get(NotificationsRealtimeService);
  realtimeService.attachServer(wsServer);

  // -------------------------------
  // Startup Logs
  // -------------------------------
  logger.log('🚀 Notification Microservice is up and running!');
  logger.log(`🔹 HTTP API: http://localhost:${configPort}`);
  logger.log(`🔹 Health Check: http://localhost:${configPort}/health`);
  logger.log(`🔹 WebSocket: ws://localhost:${configPort}/ws/notifications`);
  logger.log(`🔹 RabbitMQ Queue: ${notificationQueue} (${rabbitMqUrl})`);
  logger.log(`🔹 Kafka Brokers: ${kafkaBrokers.join(', ')} | Group: ${kafkaGroup}`);
  logger.log('------------------------------------------------------------');
}

bootstrap();
