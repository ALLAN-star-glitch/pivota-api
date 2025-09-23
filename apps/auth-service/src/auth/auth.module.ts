import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { USER_PROTO_PATH } from '@pivota-api/protos';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '3600s' }, // 1 hour
    }),

    // Register gRPC + Kafka
    ClientsModule.register([
      // gRPC (direct calls to UserService)
      {
        name: 'USER_GRPC',
        transport: Transport.GRPC,
        options: {
          package: 'user',
          protoPath: USER_PROTO_PATH,
          url: process.env.USER_GRPC_URL || 'localhost:50052',
        },
      },
      // RabbitMQ client for refresh token events
      {
        name: 'USER_RMQ',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
          queue: process.env.RABBITMQ_NOTIFICATION_QUEUE || 'notification_queue',
          queueOptions: { durable: true },
          noAck: true,
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
      'AuthModule initialized with gRPC + RabbitMQ clients',
      '| USER_GRPC_URL =', process.env.USER_GRPC_URL ,
      '| RABBITMQ_URL =', process.env.RABBITMQ_URL 
    );
  }
}