import { Module } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { RbacController } from './rbac.controller';

import { ClientsModule, Transport } from '@nestjs/microservices';
import { USER_PROTO_PATH } from '@pivota-api/protos';
import { PrismaModule } from '../../../prisma/prisma.module'

@Module({
  imports: [
    PrismaModule,
    ClientsModule.register([
      // GRPC client for User Service
      {
        name: 'USER_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'user', // must match proto definition
          protoPath: USER_PROTO_PATH,
          url: process.env.USER_GRPC_URL || 'localhost:50052',
        },
      },
      // Kafka client
      {
        name: 'RBAC_KAFKA',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'admin-service',
            brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
          },
          consumer: {
            groupId: 'rbac-consumer-group',
          },
        },
      },
    ]),
  ],
  controllers: [RbacController],
  providers: [RbacService],
  exports: [RbacService],
})
export class RbacModule {}

