// api-gateway/src/modules/auth/authentication-gateway.module.ts
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AUTHENTICATION_PROTO_PATH, PROFILE_PROTO_PATH } from '@pivota-api/protos';
import { AuthenticationGatewayService } from './authentication-gateway.service';
import { AuthenticationGatewayController } from './authentication-gateway.controller';
import { JwtStrategy } from './jwt.strategy';
import { AuthDevController } from './auth.dev.controller';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
    ClientsModule.register([
      {
        name: 'AUTHENTICATION_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'authentication',
          protoPath: AUTHENTICATION_PROTO_PATH,
          url: process.env.AUTH_GRPC_URL || 'localhost:50091',
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
  providers: [
    AuthenticationGatewayService,
    JwtStrategy,
    AuthDevController
  ],
  controllers: [AuthenticationGatewayController, AuthDevController],
  exports: [
    AuthenticationGatewayService,
    PassportModule,
  ],
})
export class AuthenticationGatewayModule {
  constructor() {
    console.log(
      '✅ API Gateway AuthenticationGatewayModule initialized with gRPC',
    );
  }
}