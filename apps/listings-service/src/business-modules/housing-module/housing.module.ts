import { Module } from '@nestjs/common';
import { HousingController } from './housing.controller';
import { HousingService } from './housing.service';
import { PROFILE_PROTO_PATH } from '@pivota-api/protos';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PrismaModule } from '../../prisma/prisma.module';

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
                        url: process.env.LISTINGS_GRPC_URL || 'localhost:50052'
                    }
                },
        
            ]),
  ],
  controllers: [HousingController],
  providers: [HousingService],
})
export class HousingModule {}
