import { Module } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { RbacController } from './rbac.controller';
import { PrismaService } from '../prisma/prisma.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RBAC_PROTO_PATH} from '@pivota-api/protos'

@Module({
    imports: [
        ClientsModule.register(
          
            [
                {

                    name: 'USER_PACKAGE',
                    transport: Transport.GRPC,
                    options: {
                        url: process.env.GRPC_USER_SERVICE_URL || 'localhost:50052',
                        package: 'user',
                        protoPath: RBAC_PROTO_PATH,
                    }


                },
            ]
        )
    ],    
    controllers: [RbacController],    
    providers: [RbacService, PrismaService],    
    exports: [RbacService ],    
})
export class RbacModuleModule {
}
