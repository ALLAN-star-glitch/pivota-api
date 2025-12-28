import { Module } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { ProvidersController } from './providers.controller';
import { PrismaModule } from '../../prisma/prisma.module'
import { ClientsModule, Transport } from '@nestjs/microservices';
import { USER_PROTO_PATH } from '@pivota-api/protos';

@Module({
  imports: [
    PrismaModule,
    ClientsModule.register([
        {
            name: 'USER_GRPC',
            transport: Transport.GRPC,
            options: {
                package: 'user',
                protoPath: USER_PROTO_PATH,
                url: process.env.LISTINGS_GRPC_URL || 'localhost:50052'
            }
        },  
    ]),


  ],
  providers: [ProvidersService],
  controllers: [ProvidersController],
})
export class ProvidersModule {}
