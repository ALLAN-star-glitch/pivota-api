import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { jwtConstants } from './constants';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { LocalStrategy } from './local.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '3600s' }, // 1 hour
    }),
    ClientsModule.register([
      {
        name: 'USER_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'auth-service-client', // unique per microservice
            brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
          },
          consumer: {
            groupId: 'auth-service-consumer', // unique group ID per service role
            allowAutoTopicCreation: true, // auto-create topics if missing
            heartbeatInterval: 3000, // default 3000ms
            sessionTimeout: 10000,  // default 10000ms, gives enough time to join group
            retry: {
              retries: 5, // retry connecting to broker
              initialRetryTime: 1000,
            },
          },
        },
      },
    ]),
  ],
  providers: [AuthService, LocalStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {
  constructor() {
    console.log('✅ AuthModule initialized with KAFKA_BROKERS =', process.env.KAFKA_BROKERS);
  }
}
