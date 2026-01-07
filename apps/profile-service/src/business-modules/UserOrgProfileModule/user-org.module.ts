import { Module } from '@nestjs/common';
import { UserController } from './controllers/user.controller';
import { UserService } from './services/user.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PLANS_PROTO_PATH, RBAC_PROTO_PATH, SUBSCRIPTIONS_PROTO_PATH } from '@pivota-api/protos';
import { OrganisationService } from './services/organisation.service';
import { OrganisationController } from './controllers/organisation.controller';



@Module({
  imports: [
    PrismaModule,
    ClientsModule.register([
      {
        //  Kafka client for user events
        name: 'USER_KAFKA',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'user-service',
            brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
          },
          consumer: {
            groupId: 'user-service-consumer',
          },
        },
      },

       // gRPC client for RBAC service
      {
        name: 'RBAC_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'rbac',
          protoPath: RBAC_PROTO_PATH,
          url: process.env.RBAC_GRPC_URL || 'localhost:50055',
        },
      },
      
      {
        // 🔹 RabbitMQ client for notifications/jobs
        name: 'USER_RMQ',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
          queue: 'notifications_queue',
          queueOptions: {
            durable: true,
          },
        },
      },

      {
        name: 'SUBSCRIPTIONS_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'subscriptions',
          protoPath: SUBSCRIPTIONS_PROTO_PATH,
          url: process.env.ADMIN_SERVICE_GRPC_URL || 'localhost:50040',
        },
      },
      {
        name: 'PLANS_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'plans',
          protoPath: PLANS_PROTO_PATH,
          url: process.env.ADMIN_SERVICE_GRPC_URL || 'localhost:50050',
        },
      }
    ]),
  ],
  controllers: [UserController, OrganisationController],
  providers: [
    UserService,
    OrganisationService
   
  ],
})
export class UserOrgModule {
  constructor() {
    console.log(
      '✅ UserModule initialized with:',
      '\n- KAFKA_BROKERS:',
      process.env.KAFKA_BROKERS,
      '\n- RABBITMQ_URL:',
      process.env.RABBITMQ_URL,
    );
  }
}

