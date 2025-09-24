import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { EmailService } from './email.service';
import { UserSignupEmailDto, UserLoginEmailDto } from '@pivota-api/dtos';


@Controller()
export class EmailController {
  private readonly logger = new Logger(EmailController.name);

  constructor(private readonly emailService: EmailService) {}

  @EventPattern('user.signup.email')
  async handleSignupEmail(@Payload() data: UserSignupEmailDto) {
    this.logger.debug(`📥 Received signup email event: ${JSON.stringify(data)}`);
    await this.emailService.sendWelcomeEmail(data);
  }

  @EventPattern('user.login.email')
  async handleLoginEmail(@Payload() data: UserLoginEmailDto) {
    this.logger.debug(`📥 Received login email event: ${JSON.stringify(data)}`);
    await this.emailService.sendLoginEmail(data);
  }
}
