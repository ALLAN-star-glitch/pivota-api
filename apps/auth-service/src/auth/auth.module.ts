import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { jwtConstants } from './constants';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { LocalStrategy } from './local.strategy';
import { USER_PROTO_PATH } from '@pivota-api/protos';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '3600s' }, // 1 hour
    }),

    // Register gRPC + Kafka
    ClientsModule.register([
      // gRPC (direct calls to UserService)
      {
        name: 'USER_GRPC',
        transport: Transport.GRPC,
        options: {
          package: 'user',
          protoPath: USER_PROTO_PATH,
          url: process.env.USER_GRPC_URL || 'localhost:50052',
        },
      }
    ]),
  ],
  providers: [AuthService, LocalStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {
  constructor() {
    console.log(
      'AuthModule initialized with gRPC client to UserService',
      '| USER_GRPC_URL =',
      process.env.USER_GRPC_URL || 'localhost:50052',
    );
  }
}
