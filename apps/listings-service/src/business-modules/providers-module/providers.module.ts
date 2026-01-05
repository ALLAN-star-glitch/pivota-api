import { Module } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { ProvidersController } from './providers.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PROFILE_PROTO_PATH } from '@pivota-api/protos';
import { ProvidersPricingService } from './providers-pricing.service';
import { ProvidersPricingController } from './providers-pricing.controller';

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
  providers: [ProvidersService, ProvidersPricingService],
  controllers: [ProvidersController, ProvidersPricingController],
})
export class ProvidersModule {}
