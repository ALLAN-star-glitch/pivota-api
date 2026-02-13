import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationsModule } from '../notifications/notifications.module';
import { SmsService } from './sms.service';
import { SmsController } from './sms.controller';

// Type for Africa's Talking SMS client
export interface AfricastalkingSMS {
  send(options: { to: string; message: string }): Promise<unknown>;
}

@Global() // Makes SmsService injectable everywhere
@Module({
  imports: [
    NotificationsModule,
    ConfigModule.forRoot({
      isGlobal: true, // ConfigService available globally
      envFilePath: [
        `${process.cwd()}/apps/notification-service/.env`, // explicit app .env
        `${process.cwd()}/.env`, // fallback root .env
      ],
      expandVariables: true, // allow nested env variables
    }),
  ],
  providers: [
    SmsService,
    {
      provide: 'AFRICASTALKING_SMS',
      useFactory: (configService: ConfigService): AfricastalkingSMS => {
        const Africastalking = require('africastalking'); // require for Node compatibility
        const username = configService.get<string>('AT_USERNAME');
        const apiKey = configService.get<string>('AT_API_KEY');

        if (!username || !apiKey) {
          throw new Error('Africa’s Talking credentials are missing in .env');
        }

        const africastalking = Africastalking({ username, apiKey });
        return africastalking.SMS as AfricastalkingSMS; // provide typed SMS client
      },
      inject: [ConfigService],
    },
  ],
  controllers: [SmsController],
  exports: [SmsService], // allows other modules to use SmsService
})
export class SmsModule {}
