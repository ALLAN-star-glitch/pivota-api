import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AuthController } from './auth.controller';
import { AUTH_PROTO_PATH } from '@pivota-api/protos';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'AUTH_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'auth',
          protoPath: AUTH_PROTO_PATH, 
          url: 'localhost:50051',
        },
      },
    ]),
  ],
  controllers: [AuthController],
})
export class AuthModule {
  constructor() {
    console.log('✅ API Gateway AuthModule initialized with gRPC');
  }
}
