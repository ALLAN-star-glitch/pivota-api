import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from '../modules/UserProfileGatewayModule/user.module';
import { CategoriesModule } from '../modules/CategoriesGatewayModule/categories.module';
import { RbacGatewayModule } from '../modules/RbacGatewayModule/rbac-gateway.module';
import { AuthModule } from '../modules/AuthGatewayModule/auth.module';
import { JobsModule } from '../modules/JobsGatewayModule/jobs.module';


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
    JobsModule
    
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
