/* eslint-disable @typescript-eslint/no-explicit-any */
// apps/auth-service/src/modules/onboarding/services/organization-onboarding.service.ts
import {
  Injectable,
  Logger,
  Inject,
} from '@nestjs/common';
import { ClientGrpc, ClientProxy } from '@nestjs/microservices';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, lastValueFrom, Observable } from 'rxjs';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

import { ExtendedPrismaClient, PrismaService } from '../../../prisma/prisma.service';
import {
  OrganisationSignupRequestDto,
  BaseResponseDto,
  OrganizationSignupDataDto,
  AuthClientInfoDto,
  CreateOrganisationRequestDto,
  OrganizationProfileResponseDto,
  VerifyOtpDto,
} from '@pivota-api/dtos';
import { JwtPayload } from '@pivota-api/interfaces';
import {
  QueueService,
  RedisService,
  RedisSessionService,
} from '@pivota-api/shared-redis';
import { JwtService } from '@nestjs/jwt';

// Services
import { TokenService } from '../../authentication/services/token.service';
import { SessionService } from '../../authentication/services/session.service';
import { MfaService } from '../../authentication/services/mfa.service';

// ---------------- gRPC Interfaces ----------------
interface ProfileServiceGrpc {
  createOrganizationAccountWithProfiles(
    data: CreateOrganisationRequestDto,
  ): Observable<BaseResponseDto<OrganizationProfileResponseDto>>;
}

@Injectable()
export class OrganizationOnboardingService {
  private readonly logger = new Logger(OrganizationOnboardingService.name);
  private prisma: ExtendedPrismaClient;
  private profileGrpcService: ProfileServiceGrpc;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
    private readonly httpService: HttpService,
    private readonly redisSession: RedisSessionService,
    private readonly redisService: RedisService,
    private readonly queue: QueueService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly mfaService: MfaService,

  @Inject('PROFILE_GRPC_CLIENT') private readonly grpcClient: ClientGrpc,
  @Inject('KAFKA_CLIENT') private readonly kafkaClient: ClientProxy,
  @Inject('NOTIFICATION_EVENT_BUS') private readonly notificationBus: ClientProxy,
  ) {
    this.prisma = this.prismaService.prisma;
  }

  onModuleInit() {
    this.profileGrpcService = this.grpcClient.getService<ProfileServiceGrpc>('ProfileService');
    this.logger.log('OrganizationOnboardingService initialized (gRPC)');
  }

  private getProfileGrpcService(): ProfileServiceGrpc {
    if (!this.profileGrpcService) {
      this.profileGrpcService = this.grpcClient.getService<ProfileServiceGrpc>('ProfileService');
    }
    return this.profileGrpcService;
  }

  /**
   * Organization Signup with OTP Verification & Auto-Login
   */
  async signup(
    dto: OrganisationSignupRequestDto,
    clientInfo?: AuthClientInfoDto
  ): Promise<BaseResponseDto<OrganizationSignupDataDto>> {
    this.logger.log(`🏢 Org Signup: ${dto.name} from ${clientInfo?.device || 'Unknown'}`);

    if (clientInfo) {
      this.logger.debug(
        `Org signup client - Device: ${clientInfo.device}, Type: ${clientInfo.deviceType}, OS: ${clientInfo.os} ${clientInfo.osVersion || ''}, Browser: ${clientInfo.browser} ${clientInfo.browserVersion || ''}, Bot: ${clientInfo.isBot}`
      );
    }

    try {
      // 1. Verify OTP
      const otpVerification = await this.mfaService.verifyOtp({
        email: dto.email,
        code: dto.code,
        purpose: 'ORGANIZATION_EMAIL_VERIFICATION',
      } as VerifyOtpDto);

      if (!otpVerification.success || !otpVerification.data?.verified) {
        this.logger.warn(`[AUTH] Org Signup blocked: Invalid OTP for ${dto.email}`);

        this.kafkaClient.emit('organization.signup.failed', {
          email: dto.email,
          organizationName: dto.name,
          reason: 'INVALID_OTP',
          clientInfo: clientInfo ? {
            device: clientInfo.device,
            deviceType: clientInfo.deviceType,
            os: clientInfo.os,
            browser: clientInfo.browser,
            isBot: clientInfo.isBot
          } : null,
          timestamp: new Date().toISOString()
        });

        return BaseResponseDto.fail(
          'Invalid or expired verification code.',
          'UNAUTHORIZED',
          { code: 'INVALID_OTP' }
        );
      }

      const adminUserUuid = randomUUID();

      // 2. Prepare CreateOrganisationRequestDto for the Profile Service
      const createOrgProfileReq: CreateOrganisationRequestDto = {
        accountType: 'ORGANIZATION',
        adminUserUuid: adminUserUuid,
        email: dto.email,
        phone: dto.phone,
        adminFirstName: dto.adminFirstName,
        adminLastName: dto.adminLastName,
        organizationName: dto.name,
        organizationType: dto.organizationType || 'COMPANY',
        officialEmail: dto.officialEmail,
        officialPhone: dto.officialPhone,
        physicalAddress: dto.physicalAddress,
        registrationNo: dto.registrationNo,
        kraPin: dto.kraPin,
        website: dto.website,
        about: dto.about,
        logo: dto.logo,
        planSlug: dto.planSlug || 'free-forever',
        purposes: dto.purposes || [],
        profileData: dto.profileData || {}
      };

      const profileGrpcService = this.getProfileGrpcService();

      // 3. Call Profile Service to create organization account
      const orgResponse = await firstValueFrom(
        profileGrpcService.createOrganizationAccountWithProfiles(createOrgProfileReq),
      );

      if (!orgResponse.success || !orgResponse.data) {
        this.kafkaClient.emit('organization.signup.failed', {
          email: dto.email,
          organizationName: dto.name,
          reason: 'PROFILE_CREATION_FAILED',
          error: orgResponse.message,
          clientInfo: clientInfo ? {
            device: clientInfo.device,
            deviceType: clientInfo.deviceType,
            os: clientInfo.os,
            browser: clientInfo.browser,
            isBot: clientInfo.isBot
          } : null,
          timestamp: new Date().toISOString()
        });

        return BaseResponseDto.fail(
          orgResponse.message || 'Organisation profile creation failed',
          orgResponse.code || 'INTERNAL_ERROR',
          orgResponse.error
        );
      }

      const orgData = orgResponse.data;
      const adminData = orgData.admin;
      const accountData = orgData.account;

      // 4. Save Admin Credentials Locally
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      const targetPlanSlug = dto.planSlug || 'free-forever';
      const isPremium = targetPlanSlug !== 'free-forever';

      await this.prisma.credential.create({
        data: {
          userUuid: adminUserUuid,
          accountUuid: accountData.uuid,
          email: dto.email,
          passwordHash: hashedPassword,
          phone: dto.phone || null,
          mfaEnabled: true,
          accountStatus: isPremium ? 'PENDING_PAYMENT' : 'ACTIVE',
          memberStatus: 'ACTIVE',
        },
      });

      // ============ PREMIUM BRANCH: PAYMENT HAND-OFF ============
      if (isPremium && orgResponse.code === 'PAYMENT_REQUIRED') {
        return await this.handlePremiumOrgSignup(
          orgData,
          adminData,
          accountData,
          dto,
          adminUserUuid,
          targetPlanSlug,
          clientInfo
        );
      }

      // ============ FREE PLAN - Generate Tokens ============
      const tokenId = `${adminUserUuid}-${Date.now()}`;
      const now = Math.floor(Date.now() / 1000);
      const roleType = 'OrganizationAdmin';

      const payload: JwtPayload = {
        sub: adminUserUuid,
        jti: tokenId,
        iat: now,
        email: dto.email,
        accountId: accountData.uuid,
        role: roleType,
        accountType: 'ORGANIZATION',
        organizationUuid: orgData.uuid,
        planSlug: targetPlanSlug,
      };

      const accessToken = await this.jwtService.signAsync(payload, { expiresIn: '15m' });
      const refreshToken = await this.jwtService.signAsync(payload, { expiresIn: '7d' });

      const hashedToken = await bcrypt.hash(refreshToken, 10);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await this.prisma.session.create({
        data: {
          userUuid: adminUserUuid,
          tokenId: tokenId,
          hashedToken,
          device: clientInfo?.device,
          ipAddress: clientInfo?.ipAddress,
          userAgent: clientInfo?.userAgent,
          os: clientInfo?.os,
          deviceType: clientInfo?.deviceType,
          osVersion: clientInfo?.osVersion,
          browser: clientInfo?.browser,
          browserVersion: clientInfo?.browserVersion,
          isBot: clientInfo?.isBot,
          lastActiveAt: new Date(),
          expiresAt,
          revoked: false,
        },
      });

      // ============ QUEUE BACKGROUND JOBS ============
      await this.queueBackgroundJobs(dto, orgData, adminData, accountData);

      this.logger.log(`✅ Organization signup completed with auto-login for: ${dto.email}`);

      // 7. Return Success Response with tokens
      return BaseResponseDto.ok(
        {
          message: 'Organization created successfully',
          accessToken,
          refreshToken,
          redirectTo: '/dashboard',
          organization: {
            id: String(orgData.id),
            uuid: orgData.uuid,
            name: orgData.name,
            orgCode: orgData.orgCode,
            verificationStatus: orgData.verificationStatus,
            type: orgData.type,
            officialEmail: orgData.officialEmail,
            officialPhone: orgData.officialPhone,
            physicalAddress: orgData.physicalAddress,
            website: orgData.website,
            about: orgData.about,
            logo: orgData.logo,
          },
          admin: {
            uuid: adminData.uuid,
            email: adminData.email,
            roleName: adminData.roleName,
            userCode: adminData.userCode,
            firstName: adminData.firstName,
            lastName: adminData.lastName,
            phone: adminData.phone
          },
          account: {
            uuid: accountData.uuid,
            type: accountData.type,
            accountCode: accountData.accountCode,
          }
        } as unknown as OrganizationSignupDataDto,
        'Organization and Admin User created successfully',
        'CREATED'
      );

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected Auth failure';
      this.logger.error(`[ORG SIGNUP CRASH] ${message}`);

      this.kafkaClient.emit('organization.signup.error', {
        email: dto.email,
        organizationName: dto.name,
        error: message,
        clientInfo: clientInfo ? {
          device: clientInfo.device,
          deviceType: clientInfo.deviceType,
          os: clientInfo.os,
          browser: clientInfo.browser,
          isBot: clientInfo.isBot
        } : null,
        timestamp: new Date().toISOString()
      });

      return BaseResponseDto.fail(message, 'INTERNAL_ERROR');
    }
  }

  /**
   * Handle Premium Organization Signup (Payment Required)
   */
  private async handlePremiumOrgSignup(
    orgData: any,
    adminData: any,
    accountData: any,
    dto: OrganisationSignupRequestDto,
    adminUserUuid: string,
    targetPlanSlug: string,
    clientInfo?: AuthClientInfoDto
  ): Promise<BaseResponseDto<OrganizationSignupDataDto>> {
    try {
      const paymentPayload = {
        accountUuid: accountData.uuid,
        userUuid: adminData.uuid,
        email: dto.email,
        firstName: dto.adminFirstName,
        lastName: dto.adminLastName,
        planSlug: targetPlanSlug,
        amount: 5000,
        currency: 'KES',
        callbackUrl: 'https://app.pivota.com/onboarding/payment-status'
      };

      const paymentInitResponse = await lastValueFrom(
        this.httpService.post(
          `${process.env.PAYMENT_SERVICE_URL}/api/v1/payments/initiate`,
          paymentPayload,
          { headers: { 'x-internal-api-key': process.env.INTERNAL_API_KEY } }
        )
      );

      this.kafkaClient.emit('organization.signup.premium', {
        organizationUuid: orgData.uuid,
        organizationName: dto.name,
        adminEmail: dto.email,
        adminUserUuid,
        plan: targetPlanSlug,
        clientInfo: clientInfo ? {
          device: clientInfo.device,
          deviceType: clientInfo.deviceType,
          os: clientInfo.os,
          browser: clientInfo.browser
        } : null,
        timestamp: new Date().toISOString()
      });

      return BaseResponseDto.ok(
        {
          organization: orgData,
          admin: adminData,
          account: accountData,
          redirectUrl: paymentInitResponse.data.redirectUrl,
          merchantReference: paymentInitResponse.data.merchantReference,
        } as unknown as OrganizationSignupDataDto,
        'Payment required to activate organization account',
        'PAYMENT_REQUIRED'
      );

    } catch (paymentErr: unknown) {
      const message = paymentErr instanceof Error ? paymentErr.message : 'Payment service unreachable';
      this.logger.error(`[PAYMENT BRIDGE DOWN] Org ${dto.name}: ${message}`);

      return BaseResponseDto.ok(
        {
          organization: orgData,
          admin: adminData,
          account: accountData,
          redirectUrl: null,
        } as unknown as OrganizationSignupDataDto,
        'Organization registered. Our payment system is busy. Please login to complete subscription.',
        'PAYMENT_SERVICE_OFFLINE'
      );
    }
  }

  /**
   * Queue background jobs
   */
  private async queueBackgroundJobs(
    dto: OrganisationSignupRequestDto,
    orgData: any,
    adminData: any,
    accountData: any
  ): Promise<void> {
    // Send organization welcome email
    this.notificationBus.emit('organization.onboarded', {
      accountId: accountData.accountCode,
      name: dto.name,
      adminFirstName: adminData.firstName,
      adminEmail: dto.email,
      orgEmail: dto.officialEmail,
      plan: 'Free Forever',
    });

    // Send admin notification
    this.notificationBus.emit('admin.new.organization.registration', {
      recipientEmail: process.env.PIVOTA_ADMIN_NOTIFICATION_EMAIL || 'onboarding@pivotaconnect.com',
      organizationName: dto.name,
      adminName: `${dto.adminFirstName} ${dto.adminLastName}`,
      adminEmail: dto.email,
      organizationEmail: dto.officialEmail,
      registrationDate: new Date().toISOString(),
      plan: 'Free Forever'
    });

    // Send analytics via Kafka
    this.kafkaClient.emit('organization.registered', {
      organizationUuid: orgData.uuid,
      organizationName: dto.name,
      adminUserUuid: adminData.uuid,
      adminEmail: dto.email,
      accountId: accountData.accountCode,
      plan: dto.planSlug || 'free-forever',
      purposes: dto.purposes || [],
      signupSource: {
        device: 'web',
        timestamp: new Date().toISOString()
      }
    });
  }
}