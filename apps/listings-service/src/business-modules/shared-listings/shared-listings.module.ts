import { Global, Module } from '@nestjs/common';
import { ListingRegistryService } from './listing-registry.service';
import { ListingRegistryController } from './listing-registry.controller';
import {  ClientsModule, Transport } from '@nestjs/microservices';
import { LISTINGS_REGISTRY_PROTO_PATH} from '@pivota-api/protos';
import { PrismaModule } from '../../prisma/prisma.module';

@Global()
@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'LISTINGS_SERVICE',
        transport: Transport.GRPC,
        options: {
          package: 'listings_registry',
          protoPath: LISTINGS_REGISTRY_PROTO_PATH,
          url: process.env.LISTINGS_GRPC_URL || 'localhost:50058' 
        },
      },
    ]),
    PrismaModule
  ],
  providers: [ListingRegistryService],
  controllers: [ListingRegistryController],
  exports: [ListingRegistryService],  
})
export class SharedListingsModule {}
