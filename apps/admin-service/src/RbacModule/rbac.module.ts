import { Module } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { RbacController } from './rbac.controller';
import { PrismaService } from '../prisma/prisma.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { USER_PROTO_PATH } from '@pivota-api/protos';


@Module({
    imports: [
        ClientsModule.register([
      {
        name: 'USER_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'user', // must match proto definition
          protoPath: USER_PROTO_PATH,
          url: process.env.USER_GRPC_URL || 'localhost:50052'    ,
        },
      },
    ]),
    ], 
    controllers: [RbacController],    
    providers: [RbacService, PrismaService],    
    exports: [RbacService ],    
})
export class RbacModule {
}
