// api-gateway/src/modules/auth/onboarding-gateway.module.ts
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ONBOARDING_PROTO_PATH } from '@pivota-api/protos';
import { OnboardingGatewayService } from './onboarding-gateway.service';
import { OnboardingGatewayController } from './onboarding-gateway.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'ONBOARDING_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'onboarding',
          protoPath: ONBOARDING_PROTO_PATH,
          url: process.env.ONBOARDING_GRPC_URL || 'localhost:50092',
        },
      },
    ]),
  ],
  providers: [
    OnboardingGatewayService,
  ],
  controllers: [OnboardingGatewayController],
  exports: [
    OnboardingGatewayService,
  ],
})
export class OnboardingGatewayModule {
  constructor() {
    console.log(
      '✅ API Gateway OnboardingGatewayModule initialized with gRPC',
    );
  }
}