import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { UserController } from './user.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'USER_SERVICE', // Provider name for injection
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'api-gateway-user-client', // unique per gateway connection
            brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
          },
          consumer: {
            groupId: 'api-gateway-user-consumer', // unique consumer group
            allowAutoTopicCreation: true,
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
  controllers: [UserController],
})
export class UserModule {
  constructor() {
    console.log('✅ API Gateway UserModule initialized with KAFKA_BROKERS:', process.env.KAFKA_BROKERS);
  }
}
