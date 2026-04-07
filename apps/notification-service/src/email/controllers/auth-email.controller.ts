// apps/notification-service/src/email/controllers/auth-email.controller.ts

/**
 * Auth Email Controller
 * 
 * Handles authentication-related email events from RabbitMQ.
 * 
 * Events Handled:
 * - user.onboarded - New user registration welcome email
 * - user.registered.google - Google signup welcome email
 * - user.login.email - Login notifications with device info
 * - otp.requested - One-time password requests
 * 
 * @example
 * // Event payload for user.onboarded
 * {
 *   email: 'user@example.com',
 *   firstName: 'John',
 *   accountId: 'ACC-12345',
 *   plan: 'Free Forever'
 * }
 * 
 * // Event payload for user.login.email
 * {
 *   to: 'user@example.com',
 *   firstName: 'John',
 *   device: 'iPhone 14 Pro',
 *   deviceType: 'MOBILE',
 *   ipAddress: '192.168.1.100',
 *   timestamp: '2026-03-21T10:00:00Z',
 *   os: 'iOS',
 *   osVersion: '17.2',
 *   browser: 'Safari',
 *   browserVersion: '17.2'
 * }
 * 
 * // Event payload for otp.requested
 * {
 *   email: 'user@example.com',
 *   code: '123456',
 *   purpose: 'SIGNUP' | 'PASSWORD_RESET' | '2FA'
 * }
 */

import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext, Transport } from '@nestjs/microservices';
import { 
  UserOnboardedEventDto,
  UserLoginEmailDto,
  SendOtpEventDto,
} from '@pivota-api/dtos';
import { AuthEmailService } from '../services/handlers/auth-email.service';

@Controller()
export class AuthEmailController {
  private readonly logger = new Logger(AuthEmailController.name);

  constructor(private readonly authEmailService: AuthEmailService) {
     console.log('🔥🔥🔥 AuthEmailController CONSTRUCTOR CALLED 🔥🔥🔥');
  }

   

  /**
   * Handle user onboarded event - Send welcome email
   */
  @EventPattern('user.onboarded', Transport.RMQ)
  async handleUserOnboarded(
    @Payload() data: UserOnboardedEventDto,
    @Ctx() context: RmqContext
  ) {
    this.logger.debug(`[RMQ] User onboarded event for: ${data.email}`);
    await this.processEvent(
      context,
      () => this.authEmailService.sendUserWelcome(data),
      data.email
    );
  }

  /**
   * Handle Google signup event - Send Google welcome email
   */
  @EventPattern('user.registered.google', Transport.RMQ)
  async handleGoogleSignup(
    @Payload() data: { email: string; firstName: string; accountId: string },
    @Ctx() context: RmqContext
  ) {
    this.logger.debug(`[RMQ] Google signup event for: ${data.email}`);
    await this.processEvent(
      context,
      () => this.authEmailService.sendGoogleWelcome(data),
      data.email
    );
  }

  /**
   * Handle login notification event - Send login alert with device info
   */
  @EventPattern('user.login.email', Transport.RMQ)
  async handleLoginEmail(
    @Payload() data: UserLoginEmailDto,
    @Ctx() context: RmqContext
  ) {
    this.logger.debug(`[RMQ] Received login notification for: ${data.to}`);
    
    // Log rich device info for debugging
    this.logger.debug(`📱 Device: ${data.device} (${data.deviceType || 'UNKNOWN'})`);
    this.logger.debug(`💻 OS: ${data.os} ${data.osVersion || ''}`);
    this.logger.debug(`🌐 Browser: ${data.browser || 'Unknown'} ${data.browserVersion || ''}`);
    this.logger.debug(`📍 IP: ${data.ipAddress}`);
    this.logger.debug(`⏰ Time: ${data.timestamp}`);
    
    await this.processEvent(
      context,
      () => this.authEmailService.sendLoginAlert(data),
      data.to
    );
  }


  /**
 * Handle OTP request event - Send verification code email
 */
@EventPattern('otp.requested', Transport.RMQ)
async handleOtpRequested(
  @Payload() data: SendOtpEventDto,
  @Ctx() context: RmqContext
) {
  console.log('🔥🔥🔥 ========== OTP REQUEST RECEIVED ========== 🔥🔥🔥');
  console.log('📧 Email:', data.email);
  console.log('🔢 Code:', data.code);
  
  const channel = context.getChannelRef();
  const originalMsg = context.getMessage();
  
  const startTime = Date.now();
  
  try {
    console.log('📧 Attempting to send email with 30s timeout...');
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Email sending timeout after 30 seconds')), 30000);
    });
    
    await Promise.race([
      this.authEmailService.sendOtp(data),
      timeoutPromise
    ]);
    
    const duration = Date.now() - startTime;
    console.log(`✅ Email sent successfully in ${duration}ms!`);
    
    channel.ack(originalMsg);
    console.log('✅ Message acknowledged');
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Failed after ${duration}ms:`, error.message);
    console.error('❌ Not acknowledging message');
    channel.nack(originalMsg, false, false);
  }
}

  /**
   * Handle payment pending event - Send payment link email
   */
  @EventPattern('payment.pending', Transport.RMQ)
  async handlePaymentPending(
    @Payload() data: {
      email: string;
      firstName: string;
      lastName: string;
      plan: string;
      profileType?: string;
      redirectUrl: string;
      merchantReference: string;
    },
    @Ctx() context: RmqContext
  ) {
    this.logger.debug(`[RMQ] Payment pending for: ${data.email}`);
    await this.processEvent(
      context,
      () => this.authEmailService.sendPaymentPendingEmail({
        to: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        plan: data.plan,
        profileType: data.profileType,
        redirectUrl: data.redirectUrl,
        merchantReference: data.merchantReference,
      }),
      data.email
    );
  }

  /**
   * Handle payment failed event - Send payment service unavailable email
   */
  @EventPattern('payment.failed', Transport.RMQ)
  async handlePaymentFailed(
    @Payload() data: {
      email: string;
      firstName: string;
      lastName: string;
      plan: string;
      profileType?: string;
      errorMessage: string;
    },
    @Ctx() context: RmqContext
  ) {
    this.logger.debug(`[RMQ] Payment failed for: ${data.email}`);
    await this.processEvent(
      context,
      () => this.authEmailService.sendPaymentFailedEmail({
        to: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        plan: data.plan,
        profileType: data.profileType,
        errorMessage: data.errorMessage,
      }),
      data.email
    );
  }

  /**
   * Handle payment success event - Send payment confirmation email
   */
  @EventPattern('payment.success', Transport.RMQ)
  async handlePaymentSuccess(
    @Payload() data: {
      email: string;
      firstName: string;
      lastName: string;
      plan: string;
      accountId: string;
    },
    @Ctx() context: RmqContext
  ) {
    this.logger.debug(`[RMQ] Payment success for: ${data.email}`);
    await this.processEvent(
      context,
      () => this.authEmailService.sendPaymentSuccessEmail({
        to: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        plan: data.plan,
        accountId: data.accountId,
      }),
      data.email
    );
  }

  /**
   * Shared private processor for event handling with proper acknowledgment
   */
private async processEvent(
  context: RmqContext,
  action: () => Promise<void>,
  identifier: string
) {
  const channel = context.getChannelRef();
  const originalMsg = context.getMessage();
  const pattern = context.getPattern();
  
  console.log(`🔍 STEP 1: Processing event: ${pattern} for ${identifier}`);
  this.logger.log(`[RMQ] Processing event: ${pattern} for ${identifier}`);
  
  const startTime = Date.now();
  try {
    console.log(`🔍 STEP 2: About to execute action for ${identifier}`);
    await action();
    console.log(`🔍 STEP 3: Action completed successfully for ${identifier}`);
    
    console.log(`🔍 STEP 4: Acknowledging message for ${identifier}`);
    channel.ack(originalMsg);
    console.log(`🔍 STEP 5: Message acknowledged for ${identifier}`);
    
    const duration = Date.now() - startTime;
    this.logger.log(`[RMQ] Successfully processed ${pattern} for ${identifier} (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`🔍 STEP ERROR: Failed at ${duration}ms: ${error.message}`);
    this.logger.error(`[RMQ] Failed ${pattern} for ${identifier} after ${duration}ms: ${error.message}`);
    channel.nack(originalMsg, false, false);
  }
}
}