import { Module } from '@nestjs/common';
import { SubscriptionService } from './services/subscription.service';
import { SubscriptionController } from './controllers/subscription.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { USER_PROTO_PATH } from '@pivota-api/protos';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
          ClientsModule.register([
            // GRPC client for User Service
            {
              name: 'USER_PACKAGE',
              transport: Transport.GRPC,
              options: {
                package: 'user', 
                protoPath: USER_PROTO_PATH,
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
  providers: [SubscriptionService],
  controllers: [SubscriptionController],
})
export class SubscriptionModule {}



