import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RBAC_PROTO_PATH, PROFILE_PROTO_PATH } from '@pivota-api/protos';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '3600s' }, // 1 hour
    }),

    ClientsModule.register([
      // 1. gRPC: Profile Service (Identity Creation)
      {
        name: 'PROFILE_GRPC',
        transport: Transport.GRPC,
        options: {
          package: 'profile',
          protoPath: PROFILE_PROTO_PATH,
          url: process.env.PROFILE_GRPC_URL || 'localhost:50052',
        },
      },
      
      // 2. gRPC: RBAC Service (Role Authorization checks)
      {
        name: 'RBAC_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'rbac',
          protoPath: RBAC_PROTO_PATH,
          url: process.env.RBAC_GRPC_URL || 'localhost:50055',
        },
      },
      
      //  RMQ: Notification Event Bus (Emails/Alerts)
      {
        name: 'NOTIFICATION_EVENT_BUS', 
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RMQ_URL || 'amqp://localhost:5672'],
          queue: 'notification_email_queue', // Consumed by Notification Service
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
      '🚀 AuthModule: gRPC Clients & Dual RMQ Event Buses initialized.',
      '| Profile GRPC:', process.env.PROFILE_GRPC_URL,
      '| RMQ URL:', process.env.RMQ_URL
    );
  }
}