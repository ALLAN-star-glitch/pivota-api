import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { PrismaModule } from '../../../prisma/prisma.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PROFILE_PROTO_PATH } from '@pivota-api/protos';

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
    
        ])

  ],
  providers: [JobsService],
  controllers: [JobsController],
})
export class JobsModule {}


