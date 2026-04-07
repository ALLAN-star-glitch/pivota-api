// apps/auth-service/src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RBAC_PROTO_PATH, PROFILE_PROTO_PATH } from '@pivota-api/protos';
import { PrismaModule } from '../../prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';
import { InvitationEventController } from './invitation-event.controller';
import { SharedRedisModule } from '@pivota-api/shared-redis';
import { EmailWorker } from '../../workers/email.worker';
import { AnalyticsWorker } from '../../workers/analytics.worker';

@Module({
  imports: [
    SharedRedisModule.forRoot(),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '3600s' },
    }),
    ClientsModule.register([
      {
        name: 'PROFILE_GRPC',
        transport: Transport.GRPC,
        options: {
          package: 'profile',
          protoPath: PROFILE_PROTO_PATH,
          url: process.env.PROFILE_GRPC_URL || 'localhost:50052',
        },
      },
      {
        name: 'RBAC_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'rbac',
          protoPath: RBAC_PROTO_PATH,
          url: process.env.RBAC_GRPC_URL || 'localhost:50055',
        },
      },
      {
        name: 'NOTIFICATION_EVENT_BUS',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RMQ_URL || 'amqp://localhost:5672'],
          queue: 'notification_email_queue',
          exchange: 'amq.direct',  // ← ADD THIS (must match what you bound)
          routingKey: 'otp.requested',  // ← ADD THIS
        },
      },
      {
        name: 'KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
          },
          consumer: {
            groupId: 'auth-service-consumer',
          },
        },
      },
    ]),
  ],
  providers: [AuthService, EmailWorker, AnalyticsWorker],
  controllers: [AuthController, InvitationEventController],
  exports: [AuthService],
})
export class AuthModule {
  constructor(
    private emailWorker: EmailWorker,
    private analyticsWorker: AnalyticsWorker,
  ) {
    console.log(
      '🚀 AuthModule: gRPC Clients & Dual RMQ Event Buses initialized.',
      '| Profile GRPC:', process.env.PROFILE_GRPC_URL,
      '| RMQ URL:', process.env.RMQ_URL
    );
    console.log('🔥 AuthModule constructor, emailWorker:', !!this.emailWorker);
    console.log('🔥 AuthModule constructor, analyticsWorker:', !!this.analyticsWorker);
    
    // Initialize email worker immediately
    setImmediate(() => {
      console.log('🔥 AuthModule - manually initializing EmailWorker');
      this.emailWorker.initialize().catch(err => {
        console.error('🔥 Failed to initialize email worker:', err);
      });
    });
    
    // Initialize analytics worker immediately
    setImmediate(() => {
      console.log('🔥 AuthModule - manually initializing AnalyticsWorker');
      this.analyticsWorker.initialize().catch(err => {
        console.error('🔥 Failed to initialize analytics worker:', err);
      });
    });
  }
}