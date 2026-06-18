/* eslint-disable @typescript-eslint/no-explicit-any */
// apps/auth-service/src/modules/onboarding/onboarding.module.ts
import { Module, Logger } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { HttpModule } from '@nestjs/axios';

// Services
import { IndividualOnboardingService } from './services/individual-onboarding.service';
import { OrganizationOnboardingService } from './services/organization-onboarding.service';

// Controllers
import { IndividualOnboardingController } from './controllers/individual-onboarding.controller';
import { OrganizationOnboardingController } from './controllers/organization-onboarding.controller';

// Workers
import { OnboardingEmailWorker } from './workers/onboarding-email.worker';

// Shared Modules
import { SharedRedisModule } from '@pivota-api/shared-redis';
import { PrismaModule } from '../../prisma/prisma.module';

// Authentication Services (shared)
import { TokenService } from '../authentication/services/token.service';
import { SessionService } from '../authentication/services/session.service';
import { MfaService } from '../authentication/services/mfa.service';

// Proto Paths
import { PROFILE_PROTO_PATH } from '@pivota-api/protos';
import { InvitationService } from './services/invitation.service';
import { InvitationEventController } from './consumers/invitation-event.controller';

@Module({
  imports: [
    // ✅ Infrastructure
    SharedRedisModule.forRoot(),
    PrismaModule,

    // ✅ HTTP Module for payment requests
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),

    // ✅ JWT Configuration
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): JwtModuleOptions => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m') as any,
        },
      }),
      inject: [ConfigService],
    }),

    // ✅ Config Module
    ConfigModule,

    // ✅ gRPC Clients - Shared with AuthenticationModule
    ClientsModule.register([
      {
        name: 'PROFILE_GRPC_CLIENT',
        transport: Transport.GRPC,
        options: {
          package: 'profile',
          protoPath: PROFILE_PROTO_PATH,
          url: process.env.PROFILE_GRPC_URL || 'localhost:50052',
        },
      },
    ]),

    // ✅ Message Brokers - Shared with AuthenticationModule
    ClientsModule.register([
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
        name: 'KAFKA_CLIENT',
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
    IndividualOnboardingController,
    OrganizationOnboardingController,
    InvitationEventController
  ],
  providers: [
    // ✅ Core Services
    IndividualOnboardingService,
    OrganizationOnboardingService,

    // ✅ Shared Authentication Services
    TokenService,
    SessionService,
    MfaService,

    // ✅ Workers
    OnboardingEmailWorker,

    InvitationService,
  ],
  exports: [IndividualOnboardingService, OrganizationOnboardingService],
})
export class OnboardingModule {
  private readonly logger = new Logger(OnboardingModule.name);

  constructor(private onboardingEmailWorker: OnboardingEmailWorker) {
    this.logger.log('📝 OnboardingModule initialized');
    this.logger.log(
      `📧 Profile GRPC: ${process.env.PROFILE_GRPC_URL || 'localhost:50052'}`,
    );
    this.logger.log(
      `📨 RMQ URL: ${process.env.RMQ_URL || 'amqp://localhost:5672'}`,
    );
    this.initializeWorkers();
  }

  private async initializeWorkers() {
    this.logger.log('🔥 Initializing onboarding workers...');
    const startTime = Date.now();

    try {
      await this.onboardingEmailWorker.initialize();
      this.logger.log('✅ OnboardingEmailWorker initialized successfully');

      const elapsed = Date.now() - startTime;
      this.logger.log(`✅ All onboarding workers initialized in ${elapsed}ms`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to initialize onboarding workers: ${error.message}`,
      );
    }
  }
}
