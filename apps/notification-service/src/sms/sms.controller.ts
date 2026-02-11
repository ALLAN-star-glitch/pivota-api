import { Controller, Post, Body, Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { SmsService } from './sms.service';
import { SendSmsDto } from './send-sms.dto';


@Controller('sms')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class SmsController {
  private readonly logger = new Logger(SmsController.name);
  
  constructor(private readonly smsService: SmsService) {} 

  @Post('send') 
  async sendSms(@Body() sendSmsDto: SendSmsDto) {
    const { to, message } = sendSmsDto;
    this.logger.log(`Sending SMS to: ${to}`);

    try {
      const result = await this.smsService.sendSms(to, message);
      return {
        status: 'success',
        message: `SMS sent to ${to}`,
        data: result,
      };
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${to}: ${error.message}`);
      return {
        status: 'error',
        message: `Failed to send SMS: ${error.message}`,
      };
    }
  }
}
