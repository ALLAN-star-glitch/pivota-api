import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { UserController } from './user.controller';
import { PROFILE_PROTO_PATH } from '@pivota-api/protos';
import { UserService } from './user.service';

@Module({
  imports: [
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
    ]),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {
}
