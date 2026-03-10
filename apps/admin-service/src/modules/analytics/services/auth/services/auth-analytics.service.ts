/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { startOfDay, startOfHour } from 'date-fns';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuthAnalyticsService {
  private readonly logger = new Logger(AuthAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Handle user.registered event
   * Emitted on successful user signup (email or Google)
   */
  async handleUserRegistered(data: {
    userUuid: string;
    email: string;
    accountId: string;
    plan: string;
    registrationMethod?: string;
    signupSource: {
      device: string;
      deviceType: string;
      os: string;
      osVersion: string;
      browser: string;
      browserVersion: string;
      isBot: boolean;
      timestamp: string;
    };
  }): Promise<void> {
    this.logger.debug(`Processing user.registered for ${data.email}`);

    try {
      // Store raw event
      await this.prisma.authEventLog.create({
        data: {
          eventType: 'user.registered',
          userUuid: data.userUuid,
          email: data.email,
          emailHash: this.hashEmail(data.email),
          payload: data as any,
          clientInfo: data.signupSource as any,
          occurredAt: new Date(data.signupSource.timestamp),
        },
      });

      // Update daily metrics
      await this.updateDailyAuthMetrics(data.signupSource.timestamp, {
        totalSignups: { increment: 1 },
        ...(data.registrationMethod === 'GOOGLE' 
          ? { googleSignups: { increment: 1 } } 
          : { emailSignups: { increment: 1 } }
        ),
        individualSignups: { increment: 1 },
        ...(data.plan !== 'free-forever' 
          ? { premiumSignups: { increment: 1 } } 
          : { freeSignups: { increment: 1 } }
        ),
        ...this.getDeviceCounters(data.signupSource),
      });

      // Update hourly metrics
      await this.updateHourlyAuthMetrics(data.signupSource.timestamp, {
        signups: { increment: 1 },
      });

    } catch (error) {
      this.logger.error(`Failed to process user.registered: ${error.message}`);
    }
  }

  /**
   * Handle user.login.google event
   * Emitted when existing user logs in with Google
   */
  async handleUserLoginGoogle(data: {
    userUuid: string;
    email: string;
    isNewUser: boolean;
    clientInfo: {
      device: string;
      deviceType: string;
      os: string;
      osVersion: string;
      browser: string;
      browserVersion: string;
      isBot: boolean;
      timestamp: string;
    };
  }): Promise<void> {
    this.logger.debug(`Processing user.login.google for ${data.email}`);

    try {
      // Store raw event
      await this.prisma.authEventLog.create({
        data: {
          eventType: 'user.login.google',
          userUuid: data.userUuid,
          email: data.email,
          emailHash: this.hashEmail(data.email),
          payload: data as any,
          clientInfo: data.clientInfo as any,
          occurredAt: new Date(data.clientInfo.timestamp),
        },
      });

      // Update daily metrics
      await this.updateDailyAuthMetrics(data.clientInfo.timestamp, {
        googleLogins: { increment: 1 },
        totalLogins: { increment: 1 },
        ...this.getDeviceCounters(data.clientInfo),
      });

      // Update hourly metrics
      await this.updateHourlyAuthMetrics(data.clientInfo.timestamp, {
        logins: { increment: 1 },
      });

    } catch (error) {
      this.logger.error(`Failed to process user.login.google: ${error.message}`);
    }
  }

  /**
   * Handle user.signup.failed event
   * Emitted when signup fails (invalid OTP or profile creation failed)
   */
  async handleUserSignupFailed(data: {
    email: string;
    reason: string;
    error?: string;
    clientInfo?: {
      device: string;
      deviceType: string;
      os: string;
      osVersion: string;
      browser: string;
      browserVersion: string;
      isBot: boolean;
      timestamp: string;
    };
  }): Promise<void> {
    this.logger.debug(`Processing user.signup.failed for ${data.email}: ${data.reason}`);

    try {
      // Store raw event
      await this.prisma.authEventLog.create({
        data: {
          eventType: 'user.signup.failed',
          email: data.email,
          emailHash: this.hashEmail(data.email),
          payload: data as any,
          clientInfo: data.clientInfo as any,
          occurredAt: new Date(data.clientInfo?.timestamp || new Date()),
        },
      });

      // Update daily metrics
      await this.updateDailyAuthMetrics(
        data.clientInfo?.timestamp || new Date().toISOString(),
        {
          failedSignups: { increment: 1 },
          ...(data.reason === 'INVALID_OTP' ? { invalidOtpSignups: { increment: 1 } } : {}),
          ...(data.reason === 'PROFILE_CREATION_FAILED' ? { profileFailedSignups: { increment: 1 } } : {}),
        }
      );

    } catch (error) {
      this.logger.error(`Failed to process user.signup.failed: ${error.message}`);
    }
  }

  /**
   * Handle user.signup.error event
   * Emitted when unexpected error occurs during signup
   */
  async handleUserSignupError(data: {
    email: string;
    error: string;
    clientInfo?: {
      device: string;
      deviceType: string;
      os: string;
      browser: string;
      isBot: boolean;
      timestamp: string;
    };
  }): Promise<void> {
    this.logger.debug(`Processing user.signup.error for ${data.email}`);

    try {
      // Store raw event
      await this.prisma.authEventLog.create({
        data: {
          eventType: 'user.signup.error',
          email: data.email,
          emailHash: this.hashEmail(data.email),
          payload: data as any,
          clientInfo: data.clientInfo as any,
          occurredAt: new Date(data.clientInfo?.timestamp || new Date()),
        },
      });

      // Update daily metrics
      await this.updateDailyAuthMetrics(
        data.clientInfo?.timestamp || new Date().toISOString(),
        { failedSignups: { increment: 1 } }
      );

    } catch (error) {
      this.logger.error(`Failed to process user.signup.error: ${error.message}`);
    }
  }

  /**
   * Handle user.signup.premium event
   * Emitted when user signs up for premium plan (payment required)
   */
  async handleUserSignupPremium(data: {
    userUuid: string;
    email: string;
    plan: string;
    clientInfo?: {
      device: string;
      deviceType: string;
      os: string;
      browser: string;
      timestamp: string;
    };
  }): Promise<void> {
    this.logger.debug(`Processing user.signup.premium for ${data.email}: ${data.plan}`);

    try {
      // Store raw event
      await this.prisma.authEventLog.create({
        data: {
          eventType: 'user.signup.premium',
          userUuid: data.userUuid,
          email: data.email,
          emailHash: this.hashEmail(data.email),
          payload: data as any,
          clientInfo: data.clientInfo as any,
          occurredAt: new Date(data.clientInfo?.timestamp || new Date()),
        },
      });

      // This is just for tracking payment initiation - premium signups already counted in user.registered

    } catch (error) {
      this.logger.error(`Failed to process user.signup.premium: ${error.message}`);
    }
  }

  /**
   * Handle user.account.linked event
   * Emitted when Google account is linked to existing account
   */
  async handleUserAccountLinked(data: {
    userUuid: string;
    email: string;
    provider: string;
    clientInfo?: {
      device: string;
      deviceType: string;
      os: string;
      browser: string;
      isBot: boolean;
      timestamp: string;
    };
  }): Promise<void> {
    this.logger.debug(`Processing user.account.linked for ${data.email}: ${data.provider}`);

    try {
      // Store raw event
      await this.prisma.authEventLog.create({
        data: {
          eventType: 'user.account.linked',
          userUuid: data.userUuid,
          email: data.email,
          emailHash: this.hashEmail(data.email),
          payload: data as any,
          clientInfo: data.clientInfo as any,
          occurredAt: new Date(data.clientInfo?.timestamp || new Date()),
        },
      });

      // Update daily metrics
      await this.updateDailyAuthMetrics(
        data.clientInfo?.timestamp || new Date().toISOString(),
        { accountsLinked: { increment: 1 } }
      );

    } catch (error) {
      this.logger.error(`Failed to process user.account.linked: ${error.message}`);
    }
  }

  /**
   * Handle user.login.error event
   * Emitted when Google login fails
   */
  async handleUserLoginError(data: {
    error: string;
    method: string;
    clientInfo?: {
      device: string;
      deviceType: string;
      os: string;
      browser: string;
      isBot: boolean;
      timestamp: string;
    };
  }): Promise<void> {
    this.logger.debug(`Processing user.login.error: ${data.error}`);

    try {
      // Store raw event
      await this.prisma.authEventLog.create({
        data: {
          eventType: 'user.login.error',
          payload: data as any,
          clientInfo: data.clientInfo as any,
          occurredAt: new Date(data.clientInfo?.timestamp || new Date()),
        },
      });

      // Update daily metrics
      await this.updateDailyAuthMetrics(
        data.clientInfo?.timestamp || new Date().toISOString(),
        { 
          loginErrors: { increment: 1 }, 
          failedLogins: { increment: 1 } 
        }
      );

    } catch (error) {
      this.logger.error(`Failed to process user.login.error: ${error.message}`);
    }
  }

  /**
   * Handle organization.signup.failed event
   */
  async handleOrganizationSignupFailed(data: {
    email: string;
    organizationName: string;
    reason: string;
    error?: string;
    clientInfo?: {
      device: string;
      deviceType: string;
      os: string;
      browser: string;
      isBot: boolean;
      timestamp: string;
    };
  }): Promise<void> {
    this.logger.debug(`Processing organization.signup.failed for ${data.organizationName}`);

    try {
      await this.prisma.authEventLog.create({
        data: {
          eventType: 'organization.signup.failed',
          email: data.email,
          emailHash: this.hashEmail(data.email),
          payload: data as any,
          clientInfo: data.clientInfo as any,
          occurredAt: new Date(data.clientInfo?.timestamp || new Date()),
        },
      });

      await this.updateDailyAuthMetrics(
        data.clientInfo?.timestamp || new Date().toISOString(),
        { failedSignups: { increment: 1 } }
      );

    } catch (error) {
      this.logger.error(`Failed to process organization.signup.failed: ${error.message}`);
    }
  }

  /**
   * Handle organization.signup.premium event
   */
  async handleOrganizationSignupPremium(data: {
    organizationUuid: string;
    organizationName: string;
    adminEmail: string;
    adminUserUuid: string;
    plan: string;
    clientInfo?: {
      device: string;
      deviceType: string;
      os: string;
      browser: string;
      timestamp: string;
    };
  }): Promise<void> {
    this.logger.debug(`Processing organization.signup.premium for ${data.organizationName}`);

    try {
      await this.prisma.authEventLog.create({
        data: {
          eventType: 'organization.signup.premium',
          userUuid: data.adminUserUuid,
          email: data.adminEmail,
          emailHash: this.hashEmail(data.adminEmail),
          payload: data as any,
          clientInfo: data.clientInfo as any,
          occurredAt: new Date(data.clientInfo?.timestamp || new Date()),
        },
      });

    } catch (error) {
      this.logger.error(`Failed to process organization.signup.premium: ${error.message}`);
    }
  }

  /**
   * Handle organization.signup.error event
   */
  async handleOrganizationSignupError(data: {
    email: string;
    organizationName: string;
    error: string;
    clientInfo?: {
      device: string;
      deviceType: string;
      os: string;
      browser: string;
      isBot: boolean;
      timestamp: string;
    };
  }): Promise<void> {
    this.logger.debug(`Processing organization.signup.error for ${data.organizationName}`);

    try {
      await this.prisma.authEventLog.create({
        data: {
          eventType: 'organization.signup.error',
          email: data.email,
          emailHash: this.hashEmail(data.email),
          payload: data as any,
          clientInfo: data.clientInfo as any,
          occurredAt: new Date(data.clientInfo?.timestamp || new Date()),
        },
      });

      await this.updateDailyAuthMetrics(
        data.clientInfo?.timestamp || new Date().toISOString(),
        { failedSignups: { increment: 1 } }
      );

    } catch (error) {
      this.logger.error(`Failed to process organization.signup.error: ${error.message}`);
    }
  }

  /**
   * Handle organization.registered event
   */
  async handleOrganizationRegistered(data: {
    organizationUuid: string;
    organizationName: string;
    adminUserUuid: string;
    adminEmail: string;
    accountId: string;
    plan: string;
    signupSource: {
      device: string;
      deviceType: string;
      os: string;
      osVersion: string;
      browser: string;
      browserVersion: string;
      isBot: boolean;
      timestamp: string;
    };
  }): Promise<void> {
    this.logger.debug(`Processing organization.registered for ${data.organizationName}`);

    try {
      await this.prisma.authEventLog.create({
        data: {
          eventType: 'organization.registered',
          userUuid: data.adminUserUuid,
          email: data.adminEmail,
          emailHash: this.hashEmail(data.adminEmail),
          payload: data as any,
          clientInfo: data.signupSource as any,
          occurredAt: new Date(data.signupSource.timestamp),
        },
      });

      await this.updateDailyAuthMetrics(data.signupSource.timestamp, {
        organizationSignups: { increment: 1 },
        totalSignups: { increment: 1 },
        ...(data.plan !== 'free-forever' 
          ? { premiumSignups: { increment: 1 } } 
          : { freeSignups: { increment: 1 } }
        ),
        ...this.getDeviceCounters(data.signupSource),
      });

      await this.updateHourlyAuthMetrics(data.signupSource.timestamp, {
        signups: { increment: 1 },
      });

    } catch (error) {
      this.logger.error(`Failed to process organization.registered: ${error.message}`);
    }
  }

  // ==================== PRIVATE HELPERS ====================

  private async updateDailyAuthMetrics(
    timestamp: string,
    increments: Record<string, Prisma.IntFieldUpdateOperationsInput | number>
  ): Promise<void> {
    const date = startOfDay(new Date(timestamp));

    await this.prisma.dailyAuthMetrics.upsert({
      where: { date },
      update: increments,
      create: {
        date,
        ...Object.fromEntries(
          Object.entries(increments).map(([key, value]) => [
            key,
            typeof value === 'object' && 'increment' in value ? value.increment : value
          ])
        ),
      },
    });
  }

  private async updateHourlyAuthMetrics(
    timestamp: string,
    increments: Record<string, Prisma.IntFieldUpdateOperationsInput | number>
  ): Promise<void> {
    const hour = startOfHour(new Date(timestamp));

    await this.prisma.hourlyAuthMetrics.upsert({
      where: { hour },
      update: increments,
      create: {
        hour,
        ...Object.fromEntries(
          Object.entries(increments).map(([key, value]) => [
            key,
            typeof value === 'object' && 'increment' in value ? value.increment : value
          ])
        ),
      },
    });
  }

  private getDeviceCounters(clientInfo: any): Record<string, Prisma.IntFieldUpdateOperationsInput> {
    if (!clientInfo) return {};

    const counters: Record<string, Prisma.IntFieldUpdateOperationsInput> = {};

    // Device type counters
    if (clientInfo.deviceType === 'MOBILE') counters.mobileLogins = { increment: 1 };
    if (clientInfo.deviceType === 'TABLET') counters.tabletLogins = { increment: 1 };
    if (clientInfo.deviceType === 'DESKTOP') counters.desktopLogins = { increment: 1 };
    if (clientInfo.isBot) counters.botRequests = { increment: 1 };

    // OS counters
    if (clientInfo.os?.toLowerCase().includes('ios')) counters.iosLogins = { increment: 1 };
    if (clientInfo.os?.toLowerCase().includes('android')) counters.androidLogins = { increment: 1 };
    if (clientInfo.os?.toLowerCase().includes('windows')) counters.windowsLogins = { increment: 1 };
    if (clientInfo.os?.toLowerCase().includes('mac')) counters.macLogins = { increment: 1 };

    // Browser counters
    if (clientInfo.browser?.toLowerCase().includes('chrome')) counters.chromeLogins = { increment: 1 };
    if (clientInfo.browser?.toLowerCase().includes('safari')) counters.safariLogins = { increment: 1 };
    if (clientInfo.browser?.toLowerCase().includes('firefox')) counters.firefoxLogins = { increment: 1 };

    return counters;
  }

  private hashEmail(email: string): string {
    // Simple hash for analytics - not for security
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(email).digest('hex');
  }
}