import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { jwtConstants } from './constants';
import { JwtStrategy } from './jwt.strategy';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '3600s' }, // 1 hour
    }),
    ClientsModule.register([
      {
        name: 'KAFKA_SERVICE', // This is the provider name
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: "auth-service" //unique identifier for this service
            ,
            brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
          },
          consumer: {
            groupId: 'auth-service-consumer', // unique per service
          },
        },
      },
    ]),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {

  constructor() {
    console.log('KAFKA_BROKERS =', process.env.KAFKA_BROKERS);
  }
}
