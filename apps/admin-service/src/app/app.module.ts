import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RbacModule } from '../modules/rbac-and-security/rbac/rbac.module';
import { PlanModule } from '../modules/plans/plan.module';
import { SubscriptionModule } from '../modules/subscriptions/subscription.module';
import { HttpModule } from '@nestjs/axios';



@Module({
  imports: [
    HttpModule.register({
      timeout: 10000, // External APIs can be slow
      maxRedirects: 5,
    }),
    ConfigModule.forRoot({  
      isGlobal: true, //Make config available accross all modules
      envFilePath: [`.env.${process.env.NODE_ENV || 'dev'}`],
     }), // Loads .env.dev or .env.prod depending on NODE_ENV
 RbacModule,
 PlanModule,
 SubscriptionModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
