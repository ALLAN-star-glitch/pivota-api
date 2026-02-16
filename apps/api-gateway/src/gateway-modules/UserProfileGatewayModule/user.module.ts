import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { UserController } from './user.controller';
import { AUTH_PROTO_PATH, PROFILE_PROTO_PATH } from '@pivota-api/protos';
import { UserService } from './user.service';
import { SubscriptionsGatewayModule } from '../SubscriptionsGatewayModule/subscriptions-gateway.module';

@Module({
  imports: [
    SubscriptionsGatewayModule, // Import the SubscriptionsGatewayModule to use its services  
    ClientsModule.register([
      {
        name: 'PROFILE_PACKAGE', // Provider name for injection
        transport: Transport.GRPC,
        options: {
          url: process.env.GRPC_USER_SERVICE_URL || 'localhost:50052',
          package: 'profile', 
          protoPath: PROFILE_PROTO_PATH,
          },
      }, 
      {
        name: 'AUTH_PACKAGE',
        transport: Transport.GRPC,
        options: {
          url: process.env.AUTH_GRPC_URL || 'localhost:50051',
          package: 'auth',
          protoPath: AUTH_PROTO_PATH
        }
      }
    ]),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {
}
