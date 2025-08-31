import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: 
  [
    PrismaModule,
    ClientsModule.register([
      {
        name: 'KAFKA_SERVICE', 
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: "user-service", //unique identifier for this service
            brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
          },
          consumer: {
            groupId: 'user-service-consumer', // unique per service
          },
        },
      },
    ]),
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {
  constructor() {
    console.log('KAFKA BROKERS: ', process.env.KAFKA_BROKERS);
  }
}

