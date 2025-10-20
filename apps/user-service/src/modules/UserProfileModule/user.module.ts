import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ClientsModule, Transport } from '@nestjs/microservices';



@Module({
  imports: [
    PrismaModule,
    ClientsModule.register([
      {
        //  Kafka client for user events
        name: 'USER_KAFKA',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'user-service',
            brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
          },
          consumer: {
            groupId: 'user-service-consumer',
          },
        },
      },
      {
        // 🔹 RabbitMQ client for notifications/jobs
        name: 'USER_RMQ',
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
  controllers: [UserController],
  providers: [
    UserService,
   
  ],
})
export class UserModule {
  constructor() {
    console.log(
      '✅ UserModule initialized with:',
      '\n- KAFKA_BROKERS:',
      process.env.KAFKA_BROKERS,
      '\n- RABBITMQ_URL:',
      process.env.RABBITMQ_URL,
    );
  }
}

