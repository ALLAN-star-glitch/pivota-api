/* eslint-disable @typescript-eslint/no-explicit-any */
import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { AuthAnalyticsService } from '../services/auth-analytics.service';


@Controller('auth-analytics')
export class AuthAnalyticsController {
  private readonly logger = new Logger(AuthAnalyticsController.name);
  constructor(private readonly analyticsService: AuthAnalyticsService) {}

  /**
   * Handle user.registered event
   * Emitted on successful user signup (email or Google)
   */
  @EventPattern('user.registered')
  async handleUserRegistered(@Payload() data: any) {
    this.logger.log(`Received user.registered event: ${JSON.stringify(data)}`);
    await this.analyticsService.handleUserRegistered(data);
  }
  
  
  /**
   * Handle user.login.google event 
   * Emitted when existing user logs in with Google
   */
  @EventPattern('user.login.google')
  async handleUserLoginGoogle(@Payload() data: any) {
    await this.analyticsService.handleUserLoginGoogle(data);
  }

  /**
   * Handle user.signup.failed event
   * Emitted when signup fails (invalid OTP or profile creation failed)
   */
  @EventPattern('user.signup.failed')
  async handleUserSignupFailed(@Payload() data: any) {
    await this.analyticsService.handleUserSignupFailed(data);
  }

  /**
   * Handle user.signup.error event
   * Emitted when unexpected error occurs during signup
   */
  @EventPattern('user.signup.error')
  async handleUserSignupError(@Payload() data: any) {
    await this.analyticsService.handleUserSignupError(data);
  }

  /**
   * Handle user.signup.premium event
   * Emitted when user signs up for premium plan (payment required)
   */
  @EventPattern('user.signup.premium')
  async handleUserSignupPremium(@Payload() data: any) {
    await this.analyticsService.handleUserSignupPremium(data);
  }

  /**
   * Handle user.account.linked event
   * Emitted when Google account is linked to existing account
   */
  @EventPattern('user.account.linked')
  async handleUserAccountLinked(@Payload() data: any) {
    await this.analyticsService.handleUserAccountLinked(data);
  }

  /**
   * Handle user.login.error event
   * Emitted when Google login fails
   */
  @EventPattern('user.login.error')
  async handleUserLoginError(@Payload() data: any) {
    await this.analyticsService.handleUserLoginError(data);
  }

  /**
   * Handle organization.signup.failed event
   */
  @EventPattern('organization.signup.failed')
  async handleOrganizationSignupFailed(@Payload() data: any) {
    await this.analyticsService.handleOrganizationSignupFailed(data);
  }

  /**
   * Handle organization.signup.premium event
   */
  @EventPattern('organization.signup.premium')
  async handleOrganizationSignupPremium(@Payload() data: any) {
    await this.analyticsService.handleOrganizationSignupPremium(data);
  }

  /**
   * Handle organization.signup.error event
   */
  @EventPattern('organization.signup.error')
  async handleOrganizationSignupError(@Payload() data: any) {
    await this.analyticsService.handleOrganizationSignupError(data);
  }

  /**
   * Handle organization.registered event
   */
  @EventPattern('organization.registered')
  async handleOrganizationRegistered(@Payload() data: any) {
    await this.analyticsService.handleOrganizationRegistered(data);
  }
}