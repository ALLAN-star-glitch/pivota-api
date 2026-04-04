/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
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
    primaryPurpose?: string;
    profileType?: string;
    hasProfileData?: boolean;
    registrationMethod?: string;
    paymentStatus?: string;
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
    this.logger.debug(`Profile Type: ${data.profileType || 'none'}, Primary Purpose: ${data.primaryPurpose || 'none'}`);
    this.logger.debug(`Payment Status: ${data.paymentStatus || 'none'}, Plan: ${data.plan}`);

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

      // Build increments for daily metrics (ONLY signup-related fields)
      const increments: Record<string, any> = {
        totalSignups: { increment: 1 },
        individualSignups: { increment: 1 },
      };

      // Registration method
      if (data.registrationMethod === 'GOOGLE') {
        increments.googleSignups = { increment: 1 };
      } else {
        increments.emailSignups = { increment: 1 };
      }

      // Plan type
      if (data.plan !== 'free-forever') {
        increments.premiumSignups = { increment: 1 };
        if (data.paymentStatus === 'PENDING') {
          increments.premiumIntentSignups = { increment: 1 };
        }
      } else {
        increments.freeSignups = { increment: 1 };
      }

      // Profile type counters
      if (data.profileType) {
        switch (data.profileType) {
          case 'JOB_SEEKER':
            increments.jobSeekerSignups = { increment: 1 };
            break;
          case 'SKILLED_PROFESSIONAL':
            increments.skilledProfessionalSignups = { increment: 1 };
            break;
          case 'INTERMEDIARY_AGENT':
            increments.agentSignups = { increment: 1 };
            break;
          case 'HOUSING_SEEKER':
            increments.housingSeekerSignups = { increment: 1 };
            break;
          case 'SUPPORT_BENEFICIARY':
            increments.supportBeneficiarySignups = { increment: 1 };
            break;
          case 'EMPLOYER':
            increments.employerSignups = { increment: 1 };
            break;
          case 'PROPERTY_OWNER':
            increments.propertyOwnerSignups = { increment: 1 };
            break;
        }
      }

      // Primary purpose counters
      if (data.primaryPurpose) {
        switch (data.primaryPurpose) {
          case 'FIND_JOB':
            increments.purposeFindJob = { increment: 1 };
            break;
          case 'OFFER_SKILLED_SERVICES':
            increments.purposeOfferServices = { increment: 1 };
            break;
          case 'WORK_AS_AGENT':
            increments.purposeWorkAsAgent = { increment: 1 };
            break;
          case 'FIND_HOUSING':
            increments.purposeFindHousing = { increment: 1 };
            break;
          case 'GET_SOCIAL_SUPPORT':
            increments.purposeGetSupport = { increment: 1 };
            break;
          case 'HIRE_EMPLOYEES':
            increments.purposeHireEmployees = { increment: 1 };
            break;
          case 'LIST_PROPERTIES':
            increments.purposeListProperties = { increment: 1 };
            break;
          case 'JUST_EXPLORING':
            increments.purposeJustExploring = { increment: 1 };
            break;
        }
      }

      // Profile completion indicator
      if (data.hasProfileData) {
        increments.signupsWithProfileData = { increment: 1 };
      }

      // Device counters (for signups)
      if (data.signupSource) {
        if (data.signupSource.deviceType === 'MOBILE') increments.mobileSignups = { increment: 1 };
        if (data.signupSource.deviceType === 'TABLET') increments.tabletSignups = { increment: 1 };
        if (data.signupSource.deviceType === 'DESKTOP') increments.desktopSignups = { increment: 1 };
        if (data.signupSource.isBot) increments.botSignups = { increment: 1 };
      }

      // Update daily metrics
      await this.updateDailyAuthMetrics(data.signupSource.timestamp, increments);

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

      // Build increments for daily metrics (ONLY login-related fields)
      const increments: Record<string, any> = {
        totalLogins: { increment: 1 },
        googleLogins: { increment: 1 },
      };

      // Device counters for logins
      if (data.clientInfo) {
        if (data.clientInfo.deviceType === 'MOBILE') increments.mobileLogins = { increment: 1 };
        if (data.clientInfo.deviceType === 'TABLET') increments.tabletLogins = { increment: 1 };
        if (data.clientInfo.deviceType === 'DESKTOP') increments.desktopLogins = { increment: 1 };
        if (data.clientInfo.isBot) increments.botLogins = { increment: 1 };

        // OS counters
        if (data.clientInfo.os?.toLowerCase().includes('ios')) increments.iosLogins = { increment: 1 };
        if (data.clientInfo.os?.toLowerCase().includes('android')) increments.androidLogins = { increment: 1 };
        if (data.clientInfo.os?.toLowerCase().includes('windows')) increments.windowsLogins = { increment: 1 };
        if (data.clientInfo.os?.toLowerCase().includes('mac')) increments.macLogins = { increment: 1 };

        // Browser counters
        if (data.clientInfo.browser?.toLowerCase().includes('chrome')) increments.chromeLogins = { increment: 1 };
        if (data.clientInfo.browser?.toLowerCase().includes('safari')) increments.safariLogins = { increment: 1 };
        if (data.clientInfo.browser?.toLowerCase().includes('firefox')) increments.firefoxLogins = { increment: 1 };
      }

      // Update daily metrics
      await this.updateDailyAuthMetrics(data.clientInfo.timestamp, increments);

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
   */
  async handleUserSignupFailed(data: {
    email: string;
    reason: string;
    primaryPurpose?: string;
    profileType?: string;
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

      const increments: Record<string, any> = {
        failedSignups: { increment: 1 },
      };

      if (data.reason === 'INVALID_OTP') {
        increments.invalidOtpSignups = { increment: 1 };
      } else if (data.reason === 'PROFILE_CREATION_FAILED') {
        increments.profileFailedSignups = { increment: 1 };
      }

      await this.updateDailyAuthMetrics(
        data.clientInfo?.timestamp || new Date().toISOString(),
        increments
      );

    } catch (error) {
      this.logger.error(`Failed to process user.signup.failed: ${error.message}`);
    }
  }

  /**
   * Handle user.signup.error event
   */
  async handleUserSignupError(data: {
    email: string;
    error: string;
    primaryPurpose?: string;
    profileType?: string;
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
   */
  async handleUserSignupPremium(data: {
    userUuid: string;
    email: string;
    accountId: string;
    plan: string;
    profileType?: string;
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

      const increments: Record<string, any> = {
        premiumIntentSignups: { increment: 1 },
      };

      if (data.profileType === 'JOB_SEEKER') {
        increments.premiumJobSeekerIntent = { increment: 1 };
      } else if (data.profileType === 'SKILLED_PROFESSIONAL') {
        increments.premiumSkilledProfessionalIntent = { increment: 1 };
      } else if (data.profileType === 'EMPLOYER') {
        increments.premiumEmployerIntent = { increment: 1 };
      } else if (data.profileType === 'PROPERTY_OWNER') {
        increments.premiumPropertyOwnerIntent = { increment: 1 };
      }

      await this.updateDailyAuthMetrics(
        data.clientInfo?.timestamp || new Date().toISOString(),
        increments
      );

    } catch (error) {
      this.logger.error(`Failed to process user.signup.premium: ${error.message}`);
    }
  }

  /**
   * Handle user.payment.failed event
   * Emitted when payment initiation fails for premium user
   */
  async handleUserPaymentFailed(data: {
    userUuid: string;
    email: string;
    accountId: string;
    plan: string;
    profileType?: string;
    error: string;
    timestamp: string;
  }): Promise<void> {
    this.logger.debug(`Processing user.payment.failed for ${data.email}: ${data.error}`);

    try {
      await this.prisma.authEventLog.create({
        data: {
          eventType: 'user.payment.failed',
          userUuid: data.userUuid,
          email: data.email,
          emailHash: this.hashEmail(data.email),
          payload: data as any,
          occurredAt: new Date(data.timestamp),
        },
      });

      await this.updateDailyAuthMetrics(data.timestamp, {
        paymentFailures: { increment: 1 },
      });

    } catch (error) {
      this.logger.error(`Failed to process user.payment.failed: ${error.message}`);
    }
  }

  /**
   * Handle user.account.linked event
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
      await this.prisma.authEventLog.create({
        data: {
          eventType: 'user.login.error',
          payload: data as any,
          clientInfo: data.clientInfo as any,
          occurredAt: new Date(data.clientInfo?.timestamp || new Date()),
        },
      });

      await this.updateDailyAuthMetrics(
        data.clientInfo?.timestamp || new Date().toISOString(),
        { loginErrors: { increment: 1 }, failedLogins: { increment: 1 } }
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

      await this.updateDailyAuthMetrics(
        data.clientInfo?.timestamp || new Date().toISOString(),
        { premiumIntentSignups: { increment: 1 } }
      );

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
    purposes?: string[];
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

      const increments: Record<string, any> = {
        organizationSignups: { increment: 1 },
        totalSignups: { increment: 1 },
      };

      if (data.plan !== 'free-forever') {
        increments.premiumSignups = { increment: 1 };
      } else {
        increments.freeSignups = { increment: 1 };
      }

      // Organization purpose counters
      if (data.purposes) {
        if (data.purposes.includes('hire_employees')) increments.orgPurposeHireEmployees = { increment: 1 };
        if (data.purposes.includes('list_properties')) increments.orgPurposeListProperties = { increment: 1 };
        if (data.purposes.includes('offer_skilled_services')) increments.orgPurposeOfferServices = { increment: 1 };
        if (data.purposes.includes('provide_social_support')) increments.orgPurposeProvideSupport = { increment: 1 };
        if (data.purposes.includes('act_as_agent')) increments.orgPurposeActAsAgent = { increment: 1 };
      }

      await this.updateDailyAuthMetrics(data.signupSource.timestamp, increments);

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

  private hashEmail(email: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(email).digest('hex');
  }
}