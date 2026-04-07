// apps/notification-service/src/email/controllers/payment-email.controller.ts

/**
 * Payment Email Controller
 * 
 * Handles payment-related email events from RabbitMQ.
 * 
 * Events Handled:
 * - payment.required - User selected a paid plan, payment needed
 * - payment.confirmed - Payment successfully processed
 * 
 * @example
 * // Event payload for payment.required
 * {
 *   email: 'user@example.com',
 *   firstName: 'John',
 *   plan: 'Pro',
 *   redirectUrl: 'https://payment.pivota.com/checkout/123'
 * }
 * 
 * // Event payload for payment.confirmed
 * {
 *   email: 'user@example.com',
 *   firstName: 'John',
 *   plan: 'Pro',
 *   accountId: 'ACC-12345'
 * }
 */

import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext, Transport } from '@nestjs/microservices';
import { PaymentEmailService } from '../services/handlers/payment-email.service';

// Payment Required DTO
interface PaymentRequiredDto {
  email: string;
  firstName: string;
  plan: string;
  redirectUrl: string;
}

// Payment Confirmed DTO
interface PaymentConfirmedDto {
  email: string;
  firstName: string;
  plan: string;
  accountId: string;
}

@Controller()
export class PaymentEmailController {
  private readonly logger = new Logger(PaymentEmailController.name);

  constructor(private readonly paymentEmailService: PaymentEmailService) {}

  /**
   * Handle payment required event - Send payment reminder email
   */
  @EventPattern('payment.required', Transport.RMQ)
  async handlePaymentRequired(
    @Payload() data: PaymentRequiredDto,
    @Ctx() context: RmqContext
  ) {
    this.logger.debug(`[RMQ] Payment required for: ${data.email} (${data.plan})`);
    
    if (!data || !data.email) {
      this.logger.error('❌ payment.required event missing email');
      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      channel.ack(originalMsg);
      return;
    }
    
    await this.processEvent(
      context,
      () => this.paymentEmailService.sendPaymentRequired(data),
      data.email
    );
  }

  /**
   * Handle payment confirmed event - Send payment confirmation email
   */
  @EventPattern('payment.confirmed', Transport.RMQ)
  async handlePaymentConfirmed(
    @Payload() data: PaymentConfirmedDto,
    @Ctx() context: RmqContext
  ) {
    this.logger.debug(`[RMQ] Payment confirmed for: ${data.email} (${data.plan})`);
    
    if (!data || !data.email) {
      this.logger.error('❌ payment.confirmed event missing email');
      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      channel.ack(originalMsg);
      return;
    }
    
    await this.processEvent(
      context,
      () => this.paymentEmailService.sendPaymentConfirmed(data),
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
      // ✅ Don't requeue - just reject to prevent infinite retry loop
      channel.nack(originalMsg, false, false);
    }
  }
}