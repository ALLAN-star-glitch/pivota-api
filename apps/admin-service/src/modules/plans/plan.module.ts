import { Module } from '@nestjs/common';
import { PlanController } from './controllers/plan.controller';
import { PricingController } from './controllers/pricing.controller';
import { PricingService } from './services/pricing.service';
import { PlanService } from './services/plan.service';
import { PlanFeatureService } from './services/plan-feature.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PROFILE_PROTO_PATH } from '@pivota-api/protos';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    ClientsModule.register([
      {
        name: 'PROFILE_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'profile',
          protoPath: PROFILE_PROTO_PATH,
          url: process.env.USER_GRPC_URL || 'localhost:50052',
        },
      },
    ]),
  ],
  controllers: [PlanController, PricingController],
  providers: [PricingService, PlanService, PlanFeatureService],
  // ADD THIS LINE:
  exports: [PlanService, PricingService, PlanFeatureService], 
})
export class PlanModule {}