import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    PrismaModule,
    // Producer client for sending events to Auth Service
    ClientsModule.register([
      {
        name: 'AUTH_SERVICE', // clear: this client talks to Auth
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'user-service-producer', // unique per producer
            brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
          },
          producerOnlyMode: true, // only sends messages
        },
      },
    ]),
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {
  constructor() {
    console.log(
      '✅ UserModule initialized with KAFKA_BROKERS:',
      process.env.KAFKA_BROKERS,
    );
  }
}
