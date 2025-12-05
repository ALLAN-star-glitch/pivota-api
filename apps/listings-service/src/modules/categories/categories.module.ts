import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { PrismaModule } from '../../../src/prisma/prisma.module'
import { ClientsModule, Transport } from '@nestjs/microservices';
import { LISTINGS_PROTO_PATH } from '@pivota-api/protos';

@Module({
  imports: [

    PrismaModule,
    ClientsModule.register([
        {
            name: 'USER_PACKAGE',
            transport: Transport.GRPC,
            options: {
                package: 'categories',
                protoPath: LISTINGS_PROTO_PATH,
                url: process.env.LISTINGS_GRPC_URL || 'localhost:50056'
            }
        },

        {
            name: 'NOTIFICATION_KAFKA',
            transport: Transport.KAFKA,
            options: {
                client: {
                    clientId: 'notification-service',
                    brokers: [process.env.KAFKA_BROKERS || 'localhost:9092'],
                },
            }
        }

    ])

  ],
  providers: [CategoriesService],
  controllers: [CategoriesController],
})
export class CategoriesModule {}
