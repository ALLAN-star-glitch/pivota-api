import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AUTH_PROTO_PATH, PROFILE_PROTO_PATH } from '@pivota-api/protos';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { AuthDevController } from './auth.dev.controller';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }), 
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
      {
        name: 'PROFILE_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'profile',
          protoPath: PROFILE_PROTO_PATH,
          url: process.env.GRPC_USER_SERVICE_URL || 'localhost:50052',
        },
      },
    ]),
  ],
  controllers: [AuthController, AuthDevController],
  providers: [AuthService, JwtStrategy],
  exports: [PassportModule, JwtStrategy],
})
export class AuthModule {
  constructor() {
    console.log(
      '✅ API Gateway AuthModule initialized with gRPC + Passport JWT strategy',
    );
  }
}
