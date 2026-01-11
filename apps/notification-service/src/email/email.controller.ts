import { Controller, Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { EmailService } from './email.service';
import { 
  OrganizationOnboardedEventDto,
  UserLoginEmailDto,
  UserOnboardedEventDto, 
} from '@pivota-api/dtos';

@Controller()
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class EmailController {
  private readonly logger = new Logger(EmailController.name);

  constructor(private readonly emailService: EmailService) {}

  @EventPattern('user.onboarded')
  async handleSignupEmail(@Payload() data: UserOnboardedEventDto, @Ctx() context: RmqContext) {
    this.logger.debug(`EVENT RECEIVED!: for ${data.firstName}`);
    // Individual signup uses 'email'
    await this.processEvent(context, () => this.emailService.sendUserWelcomeEmail(data), data.email);
  }

  @EventPattern('organization.onboarded')
  async handleOrganizationSignupEmail(@Payload() data: OrganizationOnboardedEventDto, @Ctx() context: RmqContext) {
    this.logger.debug(`EVENT RECEIVED!: for ${data.name}`);
    
    // FIX: Use adminEmail as the primary identifier for logging 
    // since 'email' property doesn't exist on OrganizationOnboardedEventDto
    await this.processEvent(
      context, 
      () => this.emailService.sendOrganizationWelcomeEmail(data), 
      data.adminEmail 
    );
  }

  @EventPattern('user.login.email')
  async handleLoginEmail(@Payload() data: UserLoginEmailDto, @Ctx() context: RmqContext) {
    this.logger.debug(`[RMQ] Received event for: ${data.to}`);
    await this.processEvent(context, () => this.emailService.sendLoginEmail(data), data.to);
  }

  private async processEvent(context: RmqContext, action: () => Promise<void>, identifier: string) {
  const channel = context.getChannelRef();
  const originalMsg = context.getMessage();
  const pattern = context.getPattern();
  
  this.logger.log(`[RMQ] Received event: ${pattern} for ${identifier}`);
  
  const startTime = Date.now();
  try {
    await action();
    
    //  SUCCESS: Tell RabbitMQ to delete the message
    channel.ack(originalMsg);
    
    const duration = Date.now() - startTime;
    this.logger.log(`[RMQ] Successfully processed ${pattern} for ${identifier} (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - startTime;
    this.logger.error(`[RMQ] Failed ${pattern} for ${identifier} after ${duration}ms: ${error.message}`);
    
    // ❌ FAILURE: Tell RabbitMQ to put the message back in the queue to try again
    // The 'true' argument means "requeue"
    channel.nack(originalMsg, false, true); 
    
    throw error; 
  }
}
}