import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { UserController } from './controllers/user.controller';
import { AUTH_PROTO_PATH, PROFILE_PROTO_PATH } from '@pivota-api/protos';
import { UserService } from './services/user.service';
import { SubscriptionsGatewayModule } from '../SubscriptionsGatewayModule/subscriptions-gateway.module';
import { StorageService } from '@pivota-api/shared-storage';
import { MediaService } from './services/media.service';
import { MediaController } from './controllers/media.controller';

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
          protoPath: AUTH_PROTO_PATH,
        },
      },
    ]),
  ],
  controllers: [UserController, MediaController],
  providers: [UserService, StorageService, MediaService],
  exports: [UserService],
})
export class UserModule {}
