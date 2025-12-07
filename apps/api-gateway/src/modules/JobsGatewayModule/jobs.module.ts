import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { LISTINGS_JOBS_PROTO_PATH} from '@pivota-api/protos';

@Module({
  imports: [

    ClientsModule.register([
      {
            name: 'JOBS_PACKAGE',
            transport: Transport.GRPC,
            options: {
                url: process.env.LISTINGS_SERVICE_URL || 'localhost:50057',
                package: 'jobs',
                protoPath: LISTINGS_JOBS_PROTO_PATH,
            }

        }

      ]
    )
  ],
  providers: [JobsService],
  controllers: [JobsController],
})
export class JobsModule {
}
