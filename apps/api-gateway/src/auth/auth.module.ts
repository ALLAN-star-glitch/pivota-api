import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { LocalStrategy } from './local.strategy';  // 👈 your strategy
import { LocalAuthGuard } from './local-auth.guard'; // 👈 if you made one
import { AUTH_PROTO_PATH } from '@pivota-api/protos';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'local' }), // 👈 register "local"
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
  providers: [
    LocalStrategy,   // provide your strategy here
    LocalAuthGuard,  // optional: if you wrote a custom guard
  ],
})
export class AuthModule {
  constructor() {
    console.log('✅ API Gateway AuthModule initialized with gRPC + Passport Local');
  }
}
