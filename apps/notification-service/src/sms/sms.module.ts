import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SmsService } from './sms.service';
import { SmsController } from './sms.controller';

@Global() // Optional: makes SmsService injectable anywhere without importing the module repeatedly
@Module({
  imports: [
    ConfigModule, // loads .env variables into ConfigService
  ],
  providers: [SmsService],
  controllers: [SmsController],
  exports: [SmsService], // allows other modules to use SmsService
})
export class SmsModule {}
