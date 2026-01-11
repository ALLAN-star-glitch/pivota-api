import { Module } from '@nestjs/common';
import { ContractorsService } from './services/contractors.service';
import { ContractorsController } from './controllers/contractors.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PROFILE_PROTO_PATH } from '@pivota-api/protos';
import { ContractorsPricingService } from './services/contractors-pricing.service';
import { ContractorsPricingController } from './controllers/contractors-pricing.controller';

@Module({
  imports: [
    PrismaModule,
    ClientsModule.register([
      {
        name: 'PROFILE_GRPC',
        transport: Transport.GRPC,
        options: {
          package: 'profile',
          protoPath: PROFILE_PROTO_PATH,
          url: process.env.LISTINGS_GRPC_URL || 'localhost:50052',
        },
      },
    ]),
  ],
  providers: [ContractorsService, ContractorsPricingService],
  controllers: [ContractorsController, ContractorsPricingController],
})
export class ContractorsModule {}
