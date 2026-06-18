/* eslint-disable @typescript-eslint/no-explicit-any */
// apps/auth-service/src/modules/authentication/authentication.module.ts
import { Module, Logger } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

// Services
import { TokenService } from './services/token.service';
import { SessionService } from './services/session.service';
import { MfaService } from './services/mfa.service';

// Controllers
import { AuthenticationController } from './controllers/authentication.controller';

// Workers
import { SessionSyncWorker } from './workers/session-sync.worker';
import { AuthenticationEmailWorker } from './workers/authentication-email.worker';
import { AuthenticationAnalyticsWorker } from './workers/authentication_analytics.worker';

// Shared Modules
import { SharedRedisModule } from '@pivota-api/shared-redis';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthenticationService } from './services/authentication.service';

// Proto Paths
import { PROFILE_PROTO_PATH, RBAC_PROTO_PATH } from '@pivota-api/protos';
import { AccountConsumer } from './consumers/account.consumer';


@Module({
  imports: [
    // ✅ Infrastructure
    SharedRedisModule.forRoot(),
    PrismaModule,

    // ✅ JWT Configuration
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): JwtModuleOptions => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),

    // ✅ Config Module
    ConfigModule,

    // ✅ gRPC Clients - Shared across modules
    ClientsModule.register([
      {
        name: 'PROFILE_GRPC_CLIENT',  // ✅ Changed from AUTH_PROFILE_GRPC_CLIENT
        transport: Transport.GRPC,
        options: {
          package: 'profile',
          protoPath: PROFILE_PROTO_PATH,
          url: process.env.PROFILE_GRPC_URL || 'localhost:50052',
        },
      },
      {
        name: 'RBAC_GRPC_CLIENT',     // ✅ Changed from AUTH_RBAC_GRPC_CLIENT
        transport: Transport.GRPC,
        options: {
          package: 'rbac',
          protoPath: RBAC_PROTO_PATH,
          url: process.env.RBAC_GRPC_URL || 'localhost:50055',
        },
      },
    ]),

    // ✅ Message Brokers - Shared across modules
    ClientsModule.register([
      {
        name: 'NOTIFICATION_EVENT_BUS',  // ✅ Changed from AUTH_NOTIFICATION_EVENT_BUS
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RMQ_URL || 'amqp://localhost:5672'],
          queue: 'notification_email_queue',
          exchange: 'amq.direct',
          routingKey: 'otp.requested',
        },
      },
      {
        name: 'KAFKA_CLIENT',           // ✅ Changed from AUTH_KAFKA_CLIENT
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
  controllers: [
    AuthenticationController, AccountConsumer
  ],
  providers: [
    // ✅ Core Services
    TokenService,
    SessionService,
    MfaService,
    AuthenticationService,

    // ✅ Workers
    SessionSyncWorker,
    AuthenticationEmailWorker,
    AuthenticationAnalyticsWorker,
  ],
  exports: [
    TokenService,
    SessionService,
    AuthenticationService,
  ],
})
export class AuthenticationModule {
  private readonly logger = new Logger(AuthenticationModule.name);

  constructor(
    private sessionSyncWorker: SessionSyncWorker,
    private authenticationEmailWorker: AuthenticationEmailWorker,
    private authenticationAnalyticsWorker: AuthenticationAnalyticsWorker,
  ) {
    this.logger.log('🔐 AuthenticationModule initialized');
    this.logger.log(`📧 Profile GRPC: ${process.env.PROFILE_GRPC_URL || 'localhost:50052'}`);
    this.logger.log(`📨 RMQ URL: ${process.env.RMQ_URL || 'amqp://localhost:5672'}`);
    this.initializeWorkers();
  }

  private async initializeWorkers() {
    this.logger.log('🔥 Initializing authentication workers...');
    const startTime = Date.now();

    try {
      // Initialize all workers in parallel
      const results = await Promise.allSettled([
        this.sessionSyncWorker.initialize(),
        this.authenticationEmailWorker.initialize(),
        this.authenticationAnalyticsWorker.initialize(),
      ]);

      // Log results
      const workerNames = ['SessionSyncWorker', 'AuthenticationEmailWorker', 'AuthenticationAnalyticsWorker'];
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          this.logger.log(`✅ ${workerNames[index]} initialized successfully`);
        } else {
          this.logger.error(`❌ ${workerNames[index]} failed to initialize: ${result.reason}`);
        }
      });

      const elapsed = Date.now() - startTime;
      this.logger.log(`✅ All authentication workers initialized in ${elapsed}ms`);

    } catch (error) {
      this.logger.error(`❌ Failed to initialize authentication workers: ${error.message}`);
    }
  }
}