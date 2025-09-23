import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EmailModule } from '../email/email.module';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [
    EmailModule,
    SmsModule,
    ConfigModule.forRoot({
      isGlobal: true, //Make config available accross all modules
      envFilePath: [`.env.${process.env.NODE_ENV || 'dev'}`] // Loads .env.development or .env.production depending on NODE_ENV
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
