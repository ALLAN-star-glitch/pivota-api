import { Module } from '@nestjs/common';
import { RbacGatewayController } from './rbac-gateway.controller';
import { RbacGatewayService } from './rbac-gateway.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RBAC_PROTO_PATH } from '@pivota-api/protos';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'RBAC_PACKAGE', // Provider name for injection  
        transport: Transport.GRPC,  
        options: {  
          url: process.env.GRPC_RBAC_SERVICE_URL || 'localhost:50053',  
          package: 'rbac',  
          protoPath: RBAC_PROTO_PATH,  
        },  
      },  
    ]),
  ],  
  controllers: [RbacGatewayController],
  providers: [RbacGatewayService],  
  exports: [RbacGatewayService],  
})
export class RbacGatewayModule {}
