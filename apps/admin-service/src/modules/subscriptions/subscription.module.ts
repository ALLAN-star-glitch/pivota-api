import { Module } from '@nestjs/common';
import { SubscriptionService } from './services/subscription.service';
import { SubscriptionController } from './controllers/subscription.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PROFILE_PROTO_PATH } from '@pivota-api/protos';
import { PrismaModule } from '../../prisma/prisma.module';
import { PricingService } from './services/pricing.service';
import { PricingController } from './controllers/pricing.controller';

@Module({
  imports: [
    PrismaModule,
          ClientsModule.register([
            // GRPC client for User Service
            {
              name: 'PROFILE_PACKAGE',
              transport: Transport.GRPC,
              options: {
                package: 'profile', 
                protoPath: PROFILE_PROTO_PATH,
                url: process.env.USER_GRPC_URL || 'localhost:50052',
              },
            },
            {
              name: 'AUDIT_KAFKA',
              transport: Transport.KAFKA,
              options: {
                client: {
                  clientId: 'admin-service',
                  brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
                },
                consumer: {
                  groupId: 'admin-service-consumer',
                },
              },
            },

            {
              //  RabbitMQ client for notifications/jobs
              name: 'SUBSCRIPTIONS_RMQ',
              transport: Transport.RMQ,
              options: {
                urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
                queue: 'notifications_queue',
                queueOptions: {
                  durable: true,
                },
              },
            },

          ]),
  ],
  providers: [SubscriptionService, PricingService],
  controllers: [SubscriptionController, PricingController],
  exports: [SubscriptionService, PricingService]
})
export class SubscriptionModule {}



