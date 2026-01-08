import { Module } from '@nestjs/common';
import { UserController } from '../controllers/user.controller';
import { UserService } from './user.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { 
  PLANS_PROTO_PATH, 
  RBAC_PROTO_PATH, 
  SUBSCRIPTIONS_PROTO_PATH 
} from '@pivota-api/protos';
import { OrganisationService } from './organisation.service';
import { OrganisationController } from '../controllers/organisation.controller';

@Module({
  imports: [
    PrismaModule,
    ClientsModule.register([
      

      /* ---------- 3. gRPC CLIENTS (READ-ONLY) ---------- */
      // Retained for fetching data (e.g., getting profiles or plan details)
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
export class ProfileModule {
  constructor() {
    console.log(
      '🚀 ProfileModule (with Event Bus) initialized:',
      '\n- RabbitMQ (PROFILE_EVENT_BUS) listening on queue: profile_events_queue',
      '\n- gRPC Clients active for RBAC, Subscriptions, and Plans',
    );
  }
}