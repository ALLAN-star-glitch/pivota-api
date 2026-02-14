import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Africastalking from 'africastalking';
import { NotificationsModule } from '../notifications/notifications.module';
import { SmsService } from './sms.service';
import { SmsController } from './sms.controller';

export const AFRICASTALKING_SMS = 'AFRICASTALKING_SMS';

export interface AfricastalkingSMSResponse {
  SMSMessageData: {
    Message: string;
    Recipients: Array<{
      status: string;
      number: string;
      cost?: string;
      messageId?: string;
    }>;
  };
}

export interface AfricastalkingSMS {
  send(options: {
    to: string | string[];
    message: string;
  }): Promise<AfricastalkingSMSResponse>;
}

@Global()
@Module({
  imports: [NotificationsModule, ConfigModule],
  providers: [
    SmsService,
    {
      provide: AFRICASTALKING_SMS,
      useFactory: (configService: ConfigService): AfricastalkingSMS => {
        const username = configService.get<string>('AT_USERNAME');
        const apiKey = configService.get<string>('AT_API_KEY');

        if (!username || !apiKey) {
          throw new Error("Africa's Talking credentials missing in .env");
        }

        const africastalking = Africastalking({ username, apiKey });
        return africastalking.SMS as AfricastalkingSMS;
      },
      inject: [ConfigService],
    },
  ],
  controllers: [SmsController],
  exports: [SmsService],
})
export class SmsModule {}
