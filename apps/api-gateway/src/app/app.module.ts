import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from '../gateway-modules/UserProfileGatewayModule/user.module';
import { CategoriesModule } from '../gateway-modules/CategoriesGatewayModule/categories.module';
import { RbacGatewayModule } from '../gateway-modules/RbacGatewayModule/rbac-gateway.module';
import { AuthModule } from '../gateway-modules/AuthGatewayModule/auth.module';
import { PlansGatewayModule } from '../gateway-modules/PlansGatewayModule/plans-gateway.module';
import { JobsModule } from '../gateway-modules/JobsGatewayModule/jobs.module';
import { SubscriptionsGatewayModule } from '../gateway-modules/SubscriptionsGatewayModule/subscriptions-gateway.module';
import { ProvidersGatewayModule } from '../gateway-modules/ContractorsGatewayModule/contractors-gateway.module';
import { HousingGatewayModule } from '../gateway-modules/HousingGatewayModule/housing-gateway.module';
import { NotificationsGatewayModule } from '../gateway-modules/NotificationsGatewayModule/notifications-gateway.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Make config available across all modules
      envFilePath: [`.env.${process.env.NODE || 'dev'}`], // Loads .env.dev or .env.prod depending on NODE_ENV
    }),
    AuthModule,
    UserModule,
    RbacGatewayModule,
    CategoriesModule, 
    JobsModule,
    PlansGatewayModule,
    SubscriptionsGatewayModule,
    ProvidersGatewayModule,
    HousingGatewayModule,
    NotificationsGatewayModule
  
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
