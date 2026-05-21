// apps/auth-service/src/modules/auth/auth.module.ts
import { Module, Logger } from '@nestjs/common';
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
import { SessionSyncWorker } from '../../workers/session-sync.worker';
import { AccountConsumer } from '../../consumers/account.consumer';

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
          exchange: 'amq.direct',
          routingKey: 'otp.requested',
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
  providers: [AuthService, EmailWorker, AnalyticsWorker, SessionSyncWorker],
  controllers: [AuthController, InvitationEventController, AccountConsumer],
  exports: [AuthService],
})
export class AuthModule {
  private readonly logger = new Logger(AuthModule.name);

  constructor(
    private emailWorker: EmailWorker,
    private analyticsWorker: AnalyticsWorker,
    private sessionSyncWorker: SessionSyncWorker,
  ) {
    this.logger.log('🚀 AuthModule: gRPC Clients & RMQ Event Buses initialized');
    this.logger.log(`📧 Profile GRPC: ${process.env.PROFILE_GRPC_URL || 'localhost:50052'}`);
    this.logger.log(`📨 RMQ URL: ${process.env.RMQ_URL || 'amqp://localhost:5672'}`);
    
    // ✅ Initialize workers immediately in constructor
    this.initializeWorkers();
  }

  private async initializeWorkers() {
    this.logger.log('🔥 AuthModule.initializeWorkers() - Starting workers initialization...');
    const startTime = Date.now();

    // Small delay to ensure all dependencies are ready
    await new Promise(resolve => setTimeout(resolve, 100));

    // Initialize all workers in parallel
    const results = await Promise.allSettled([
      this.emailWorker.initialize(),
      this.analyticsWorker.initialize(),
      this.sessionSyncWorker.initialize(),
    ]);

    // Log results
    const workerNames = ['EmailWorker', 'AnalyticsWorker', 'SessionSyncWorker'];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        this.logger.log(`✅ ${workerNames[index]} initialized successfully`);
      } else {
        this.logger.error(`❌ ${workerNames[index]} failed to initialize: ${result.reason}`);
      }
    });

    const elapsed = Date.now() - startTime;
    this.logger.log(`✅ All workers initialized in ${elapsed}ms`);
  }
}