import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RBAC_PROTO_PATH, PROFILE_PROTO_PATH } from '@pivota-api/protos';
import { PrismaModule } from '../../prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';

const rabbitMqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const notificationQueueName =
  process.env.NOTIFICATION_QUEUE || 'notification_queue';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),

    PrismaModule,

    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret',
      signOptions: { expiresIn: '3600s' },
    }),

    ClientsModule.register([
      // gRPC: Profile Service
      {
        name: 'PROFILE_GRPC',
        transport: Transport.GRPC,
        options: {
          package: 'profile',
          protoPath: PROFILE_PROTO_PATH,
          url: process.env.PROFILE_GRPC_URL || 'localhost:50052',
        },
      },

      // gRPC: RBAC Service
      {
        name: 'RBAC_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'rbac',
          protoPath: RBAC_PROTO_PATH,
          url: process.env.RBAC_GRPC_URL || 'localhost:50055',
        },
      },

      // RabbitMQ: Notification Events
      {
        name: 'NOTIFICATION_EVENT_BUS',
        transport: Transport.RMQ,
        options: {
          urls: [rabbitMqUrl],
          queue: notificationQueueName,
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {
  constructor() {
    console.log(
      '🚀 AuthModule initialized',
      '| Profile GRPC:', process.env.PROFILE_GRPC_URL,
      '| RBAC GRPC:', process.env.RBAC_GRPC_URL,
      '| RMQ URL:', rabbitMqUrl,
      '| Notification Queue:', notificationQueueName,
    );
  }
}
