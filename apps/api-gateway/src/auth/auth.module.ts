import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'AUTH_SERVICE', // Provider name used for injection
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'api-gateway-auth-client', // unique per gateway-service connection
            brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
          },
          consumer: {
            groupId: 'api-gateway-auth-consumer', // unique consumer group
            allowAutoTopicCreation: true,          // auto-create topics if missing
            heartbeatInterval: 3000,
            sessionTimeout: 10000,
            retry: {
              retries: 5,
              initialRetryTime: 1000,
            },
          },
        },
      },
    ]),
  ],
  controllers: [AuthController],
})
export class AuthModule {
  constructor() {
    console.log('✅ API Gateway AuthModule initialized with KAFKA_BROKERS:', process.env.KAFKA_BROKERS);
  }
}
