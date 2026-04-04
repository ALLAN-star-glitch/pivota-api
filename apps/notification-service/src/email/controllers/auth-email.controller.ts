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
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { 
  UserOnboardedEventDto,
  UserLoginEmailDto,
  SendOtpEventDto,
} from '@pivota-api/dtos';
import { AuthEmailService } from '../services/handlers/auth-email.service';

@Controller()
export class AuthEmailController {
  private readonly logger = new Logger(AuthEmailController.name);

  constructor(private readonly authEmailService: AuthEmailService) {}

  /**
   * Handle user onboarded event - Send welcome email
   */
  @EventPattern('user.onboarded')
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
  @EventPattern('user.registered.google')
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
  @EventPattern('user.login.email')
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
  @EventPattern('otp.requested')
  async handleOtpRequested(
    @Payload() data: SendOtpEventDto,
    @Ctx() context: RmqContext
  ) {
    this.logger.debug(`[RMQ] OTP requested for: ${data.email} (${data.purpose})`);
    await this.processEvent(
      context,
      () => this.authEmailService.sendOtp(data),
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
    
    this.logger.log(`[RMQ] Processing event: ${pattern} for ${identifier}`);
    
    const startTime = Date.now();
    try {
      await action();
      channel.ack(originalMsg);
      const duration = Date.now() - startTime;
      this.logger.log(`[RMQ] Successfully processed ${pattern} for ${identifier} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`[RMQ] Failed ${pattern} for ${identifier} after ${duration}ms: ${error.message}`);
      channel.nack(originalMsg, false, true);
    }
  }

  // apps/notification-service/src/email/controllers/auth-email.controller.ts

// Add these new handlers to your AuthEmailController class:

/**
 * Handle payment pending event - Send payment link email
 */
@EventPattern('payment.pending')
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
@EventPattern('payment.failed')
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
@EventPattern('payment.success')
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
}