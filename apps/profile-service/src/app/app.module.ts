import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { UserOrgModule } from '../business-modules/UserOrgProfileModule/user-org.module';




@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, //Make config available accross all modules
      envFilePath: [`.env.${process.env.NODE_ENV || 'dev'}`] // Loads .env.development or .env.production depending on NODE_ENV
    }),
    UserOrgModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
















