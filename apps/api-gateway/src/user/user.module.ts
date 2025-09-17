import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { UserController } from './user.controller';
import { USER_PROTO_PATH } from '@pivota-api/protos';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'USER_PACKAGE', // Provider name for injection
        transport: Transport.GRPC,
        options: {
          url: process.env.GRPC_USER_SERVICE_URL || 'localhost:50052',
          package: 'user', 
          protoPath: USER_PROTO_PATH,
          },
      },
    ]),
  ],
  controllers: [UserController],
})
export class UserModule {
  constructor() {
    console.log('✅ API Gateway UserModule initialized with KAFKA_BROKERS:', process.env.KAFKA_BROKERS);
  }
}
