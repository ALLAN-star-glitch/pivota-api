/* eslint-disable @typescript-eslint/no-explicit-any */
// apps/notification-service/src/email/controllers/service-execution-email.controller.ts

/**
 * Service Execution Email Controller
 * 
 * Handles service execution email events from the email queue.
 * This controller processes jobs added by the service execution notification worker.
 * 
 * Events Handled:
 * - service-started-customer - Service started notification to customer
 * - service-started-contractor - Service started confirmation to contractor
 * - service-completed-customer - Service completed notification to customer
 * - service-completed-contractor - Service completed confirmation to contractor
 * - payment-released-contractor - Payment released notification to contractor
 * - customer-confirmed-customer - Customer confirmation receipt
 * - dispute-raised-admin - Dispute notification to admin
 * - customer-dissatisfied-contractor - Customer dissatisfaction notification to contractor
 * - dispute-created-customer - Dispute created confirmation to customer
 * - payment-auto-released-contractor - Auto-release notification to contractor
 * - payment-auto-released-customer - Auto-release notification to customer
 */

import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext, Transport } from '@nestjs/microservices';
import { ServiceExecutionEmailService } from '../services/handlers/service-execution-email.service';

@Controller()
export class ServiceExecutionEmailController {
  private readonly logger = new Logger(ServiceExecutionEmailController.name);

  constructor(private readonly serviceExecutionEmailService: ServiceExecutionEmailService) {
    console.log('ServiceExecutionEmailController CONSTRUCTOR CALLED');
  }

  // ===========================================================
  // SERVICE STARTED EVENTS
  // ===========================================================

  @EventPattern('service-started-customer', Transport.RMQ)
  async handleServiceStartedCustomer(@Payload() data: any, @Ctx() context: RmqContext) {
    console.log('========== SERVICE STARTED (CUSTOMER) EVENT RECEIVED ==========');
    this.logger.debug(`[RMQ] Service started event for customer: ${data.to}`);
    await this.processEvent(context, () => this.serviceExecutionEmailService.sendServiceStartedCustomer(data), data.to);
  }

  @EventPattern('service-started-contractor', Transport.RMQ)
  async handleServiceStartedContractor(@Payload() data: any, @Ctx() context: RmqContext) {
    console.log('========== SERVICE STARTED (CONTRACTOR) EVENT RECEIVED ==========');
    this.logger.debug(`[RMQ] Service started event for contractor: ${data.to}`);
    await this.processEvent(context, () => this.serviceExecutionEmailService.sendServiceStartedContractor(data), data.to);
  }
 
  // ===========================================================
  // SERVICE COMPLETED EVENTS
  // ===========================================================

  @EventPattern('service-completed-customer', Transport.RMQ)
  async handleServiceCompletedCustomer(@Payload() data: any, @Ctx() context: RmqContext) {
    console.log('========== SERVICE COMPLETED (CUSTOMER) EVENT RECEIVED ==========');
    this.logger.debug(`[RMQ] Service completed event for customer: ${data.to}`);
    await this.processEvent(context, () => this.serviceExecutionEmailService.sendServiceCompletedCustomer(data), data.to);
  }

  @EventPattern('service-completed-contractor', Transport.RMQ)
  async handleServiceCompletedContractor(@Payload() data: any, @Ctx() context: RmqContext) {
    console.log('========== SERVICE COMPLETED (CONTRACTOR) EVENT RECEIVED ==========');
    this.logger.debug(`[RMQ] Service completed event for contractor: ${data.to}`);
    await this.processEvent(context, () => this.serviceExecutionEmailService.sendServiceCompletedContractor(data), data.to);
  }

  // ===========================================================
  // CUSTOMER CONFIRMED / PAYMENT RELEASED EVENTS
  // ===========================================================

  @EventPattern('payment-released-contractor', Transport.RMQ)
  async handlePaymentReleasedContractor(@Payload() data: any, @Ctx() context: RmqContext) {
    console.log('========== PAYMENT RELEASED (CONTRACTOR) EVENT RECEIVED ==========');
    this.logger.debug(`[RMQ] Payment released event for contractor: ${data.to}`);
    await this.processEvent(context, () => this.serviceExecutionEmailService.sendPaymentReleasedContractor(data), data.to);
  }

  @EventPattern('customer-confirmed-customer', Transport.RMQ)
  async handleCustomerConfirmedCustomer(@Payload() data: any, @Ctx() context: RmqContext) {
    console.log('========== CUSTOMER CONFIRMED (CUSTOMER) EVENT RECEIVED ==========');
    this.logger.debug(`[RMQ] Customer confirmed event for customer: ${data.to}`);
    await this.processEvent(context, () => this.serviceExecutionEmailService.sendCustomerConfirmedCustomer(data), data.to);
  }

  // ===========================================================
  // DISPUTE / CUSTOMER DISSATISFIED EVENTS
  // ===========================================================

  @EventPattern('dispute-raised-admin', Transport.RMQ)
  async handleDisputeRaisedAdmin(@Payload() data: any, @Ctx() context: RmqContext) {
    console.log('========== DISPUTE RAISED (ADMIN) EVENT RECEIVED ==========');
    this.logger.debug(`[RMQ] Dispute raised event for admin`);
    await this.processEvent(context, () => this.serviceExecutionEmailService.sendDisputeRaisedAdmin(data), 'admin');
  }

  @EventPattern('customer-dissatisfied-contractor', Transport.RMQ)
  async handleCustomerDissatisfiedContractor(@Payload() data: any, @Ctx() context: RmqContext) {
    console.log('========== CUSTOMER DISSATISFIED (CONTRACTOR) EVENT RECEIVED ==========');
    this.logger.debug(`[RMQ] Customer dissatisfied event for contractor: ${data.to}`);
    await this.processEvent(context, () => this.serviceExecutionEmailService.sendCustomerDissatisfiedContractor(data), data.to);
  }

  @EventPattern('dispute-created-customer', Transport.RMQ)
  async handleDisputeCreatedCustomer(@Payload() data: any, @Ctx() context: RmqContext) {
    console.log('========== DISPUTE CREATED (CUSTOMER) EVENT RECEIVED ==========');
    this.logger.debug(`[RMQ] Dispute created event for customer: ${data.to}`);
    await this.processEvent(context, () => this.serviceExecutionEmailService.sendDisputeCreatedCustomer(data), data.to);
  }

  // ===========================================================
  // PAYMENT AUTO-RELEASED EVENTS
  // ===========================================================

  @EventPattern('payment-auto-released-contractor', Transport.RMQ)
  async handlePaymentAutoReleasedContractor(@Payload() data: any, @Ctx() context: RmqContext) {
    console.log('========== PAYMENT AUTO-RELEASED (CONTRACTOR) EVENT RECEIVED ==========');
    this.logger.debug(`[RMQ] Payment auto-released event for contractor: ${data.to}`);
    await this.processEvent(context, () => this.serviceExecutionEmailService.sendPaymentAutoReleasedContractor(data), data.to);
  }

  @EventPattern('payment-auto-released-customer', Transport.RMQ)
  async handlePaymentAutoReleasedCustomer(@Payload() data: any, @Ctx() context: RmqContext) {
    console.log('========== PAYMENT AUTO-RELEASED (CUSTOMER) EVENT RECEIVED ==========');
    this.logger.debug(`[RMQ] Payment auto-released event for customer: ${data.to}`);
    await this.processEvent(context, () => this.serviceExecutionEmailService.sendPaymentAutoReleasedCustomer(data), data.to);
  }



  // ===========================================================
  // HELPER METHOD
  // ===========================================================

  private async processEvent(
    context: RmqContext,
    action: () => Promise<void>,
    identifier: string
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    const pattern = context.getPattern();
    
    console.log(`STEP 1: Processing event: ${pattern} for ${identifier}`);
    this.logger.log(`[RMQ] Processing event: ${pattern} for ${identifier}`);
    
    const startTime = Date.now();
    try {
      console.log(`STEP 2: About to execute action for ${identifier}`);
      await action();
      console.log(`STEP 3: Action completed successfully for ${identifier}`);
      
      console.log(`STEP 4: Acknowledging message for ${identifier}`);
      channel.ack(originalMsg);
      console.log(`STEP 5: Message acknowledged for ${identifier}`);
       
      const duration = Date.now() - startTime;
      this.logger.log(`[RMQ] Successfully processed ${pattern} for ${identifier} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`STEP ERROR: Failed at ${duration}ms: ${error.message}`);
      this.logger.error(`[RMQ] Failed ${pattern} for ${identifier} after ${duration}ms: ${error.message}`);
      channel.nack(originalMsg, false, false);
    }
  }
}