import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../AuthGatewayModule/auth.module';
import { UserModule } from '../UserProfileGatewayModule/user.module';
import { RbacGatewayModule } from '../RbacGatewayModule/rbac-gateway.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Make config available across all modules
      envFilePath: [`.env.${process.env.NODE || 'dev'}`], // Loads .env.dev or .env.prod depending on NODE_ENV
    }),

    AuthModule,
    UserModule,
    RbacGatewayModule
    
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
