import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { OrganisationGatewayService } from './organisation-gateway.service';
import { OrganisationGatewayController } from './organisation-gateway.controller';
import { PROFILE_PROTO_PATH } from '@pivota-api/protos';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'PROFILE_PACKAGE', // Must match the @Inject('PROFILE_PACKAGE') in your service
        transport: Transport.GRPC,
        options: {
          // Ensure this environment variable is set in your Gateway .env
          url: process.env.GRPC_USER_SERVICE_URL || 'localhost:50052', 
          package: 'profile',
          protoPath: PROFILE_PROTO_PATH,
        },
      },
    ]),
  ],
  providers: [OrganisationGatewayService],
  controllers: [OrganisationGatewayController],
  exports: [OrganisationGatewayService], // Exported in case other gateway modules need org logic
})
export class OrganisationGatewayModule {}