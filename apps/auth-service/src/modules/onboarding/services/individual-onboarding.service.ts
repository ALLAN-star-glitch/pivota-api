/* eslint-disable @typescript-eslint/no-explicit-any */
// apps/auth-service/src/modules/onboarding/services/individual-onboarding.service.ts
import {
  Injectable,
  Logger,
  Inject,
} from '@nestjs/common';
import { ClientGrpc, ClientProxy } from '@nestjs/microservices';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, lastValueFrom, Observable } from 'rxjs';
import * as bcrypt from 'bcrypt';


import { ExtendedPrismaClient, PrismaService } from '../../../prisma/prisma.service';
import {
  UserSignupRequestDto,
  BaseResponseDto,
  SignupResponseDto,
  AuthClientInfoDto,
  CreateAccountWithProfilesRequestDto,
  AccountResponseDto,
  SkilledProfessionalProfileResponseDto,
  VerifyOtpDto,
  UserProfileResponseDto,
} from '@pivota-api/dtos';
import { JwtPayload } from '@pivota-api/interfaces';
import {
  getRateLimitConfig,
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
  createIndividualAccountWithProfiles(
    data: CreateAccountWithProfilesRequestDto
  ): Observable<BaseResponseDto<AccountResponseDto>>;

  getSkilledProfessionalByAccount(
    data: { accountUuid: string }
  ): Observable<BaseResponseDto<SkilledProfessionalProfileResponseDto>>;

  getUserProfileByUuid(
    data: { userUuid: string }
  ): Observable<BaseResponseDto<UserProfileResponseDto>>;
}

@Injectable()
export class IndividualOnboardingService {
  private readonly logger = new Logger(IndividualOnboardingService.name);
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
    this.logger.log('IndividualOnboardingService initialized (gRPC)');
  }

  private getProfileGrpcService(): ProfileServiceGrpc {
    if (!this.profileGrpcService) {
      this.profileGrpcService = this.grpcClient.getService<ProfileServiceGrpc>('ProfileService');
    }
    return this.profileGrpcService;
  }

  /**
   * Individual Signup with OTP Verification & Auto-Login
   */
  async signup(
    signupDto: UserSignupRequestDto,
    clientInfo?: AuthClientInfoDto
  ): Promise<BaseResponseDto<SignupResponseDto>> {
    const profileGrpcService = this.getProfileGrpcService();

    let profileType: string | null = null;
    let profileDataForEmail: any = null;

    this.logger.log(`Signup attempt: ${signupDto.email}`);

    try {
      // 1. Get signup rate limit configuration
      const signupLimit = getRateLimitConfig('SIGNUP_ATTEMPTS');

      // 2. Check rate limit for signup attempts
      const rateLimitResult = await this.queue.checkRateLimit(
        signupDto.email,
        'signup_attempts',
        signupLimit.maxAttempts,
        signupLimit.windowSeconds
      );

      if (!rateLimitResult.allowed) {
        const minutesLeft = Math.ceil(rateLimitResult.resetInSeconds / 60);
        this.logger.warn(`[AUTH] Signup rate limit exceeded for ${signupDto.email}`);
        return BaseResponseDto.fail(
          signupLimit.errorMessage(minutesLeft),
          'TOO_MANY_REQUESTS'
        );
      }

      // 3. Verify OTP
      const verificationResult = await this.mfaService.verifyOtp({
        email: signupDto.email,
        code: signupDto.code,
        purpose: 'EMAIL_VERIFICATION',
      } as VerifyOtpDto);

      if (!verificationResult.success || !verificationResult.data?.verified) {
        await this.queue.incrementRateLimit(
          signupDto.email,
          'signup_attempts',
          signupLimit.maxAttempts,
          signupLimit.windowSeconds
        );

        this.logger.warn(`[AUTH] Blocked signup attempt: Invalid/Expired OTP for ${signupDto.email}`);

        await this.queue.addJob(
          'analytics-queue',
          'signup-failed',
          {
            email: signupDto.email,
            reason: 'INVALID_OTP',
            primaryPurpose: signupDto.primaryPurpose,
            profileType: null,
            clientInfo: clientInfo ? {
              device: clientInfo.device,
              deviceType: clientInfo.deviceType,
              os: clientInfo.os,
              browser: clientInfo.browser,
              osVersion: clientInfo.osVersion,
              browserVersion: clientInfo.browserVersion,
              isBot: clientInfo.isBot,
            } : null,
            timestamp: new Date().toISOString()
          },
          {
            attempts: 2,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: true,
            removeOnFail: true,
          }
        );

        return BaseResponseDto.fail(
          'Invalid or expired verification code.',
          'UNAUTHORIZED',
          { code: 'INVALID_OTP' }
        );
      }

      // 4. Build the CreateAccountWithProfilesRequestDto
      const createAccountDto: any = {
        accountType: 'INDIVIDUAL',
        email: signupDto.email,
        password: signupDto.password,
        phone: signupDto.phone,
        planSlug: signupDto.planSlug || 'free-forever',
        otpCode: signupDto.code,
        firstName: signupDto.firstName,
        lastName: signupDto.lastName,
        profileImage: signupDto.profileImage,
        primaryPurpose: signupDto.primaryPurpose,
        profiles: [],
        skipEventEmission: true,
      };

      // Map profile data
      if (signupDto.jobSeekerData) {
        createAccountDto.jobSeekerData = signupDto.jobSeekerData;
        profileType = 'JOB_SEEKER';
        profileDataForEmail = {
          skills: signupDto.jobSeekerData.skills,
          jobTypes: signupDto.jobSeekerData.jobTypes,
          expectedSalary: signupDto.jobSeekerData.expectedSalary,
          headline: signupDto.jobSeekerData.headline,
        };
      } else if (signupDto.skilledProfessionalData) {
        createAccountDto.skilledProfessionalData = signupDto.skilledProfessionalData;
        profileType = 'SKILLED_PROFESSIONAL';
        profileDataForEmail = {
          profession: signupDto.skilledProfessionalData.profession,
          specialties: signupDto.skilledProfessionalData.specialties,
          serviceAreas: signupDto.skilledProfessionalData.serviceAreas,
          yearsExperience: signupDto.skilledProfessionalData.yearsExperience,
        };
      } else if (signupDto.intermediaryAgentData) {
        createAccountDto.intermediaryAgentData = signupDto.intermediaryAgentData;
        profileType = 'INTERMEDIARY_AGENT';
        profileDataForEmail = {
          agentType: signupDto.intermediaryAgentData.agentType,
          specializations: signupDto.intermediaryAgentData.specializations,
          serviceAreas: signupDto.intermediaryAgentData.serviceAreas,
          yearsExperience: signupDto.intermediaryAgentData.yearsExperience,
        };
      } else if (signupDto.housingSeekerData) {
        createAccountDto.housingSeekerData = signupDto.housingSeekerData;
        profileType = 'HOUSING_SEEKER';
        profileDataForEmail = {
          preferredTypes: signupDto.housingSeekerData.preferredTypes,
          preferredCities: signupDto.housingSeekerData.preferredCities,
          minBudget: signupDto.housingSeekerData.minBudget,
          maxBudget: signupDto.housingSeekerData.maxBudget,
        };
      } else if (signupDto.supportBeneficiaryData) {
        createAccountDto.supportBeneficiaryData = signupDto.supportBeneficiaryData;
        profileType = 'SUPPORT_BENEFICIARY';
        profileDataForEmail = {
          needs: signupDto.supportBeneficiaryData.needs,
          urgentNeeds: signupDto.supportBeneficiaryData.urgentNeeds,
          city: signupDto.supportBeneficiaryData.city,
          familySize: signupDto.supportBeneficiaryData.familySize,
        };
      } else if (signupDto.employerData) {
        createAccountDto.employerData = signupDto.employerData;
        profileType = 'EMPLOYER';
        profileDataForEmail = {
          businessName: signupDto.employerData.businessName,
          industry: signupDto.employerData.industry,
          companySize: signupDto.employerData.companySize,
          isRegistered: signupDto.employerData.isRegistered,
        };
      } else if (signupDto.propertyOwnerData) {
        createAccountDto.propertyOwnerData = signupDto.propertyOwnerData;
        profileType = 'PROPERTY_OWNER';
        profileDataForEmail = {
          propertyCount: signupDto.propertyOwnerData.propertyCount,
          propertyTypes: signupDto.propertyOwnerData.propertyTypes,
          propertyPurpose: signupDto.propertyOwnerData.propertyPurpose,
          isProfessional: signupDto.propertyOwnerData.isProfessional,
        };
      }

      const targetPlanSlug = signupDto.planSlug || 'free-forever';
      const isPremium = targetPlanSlug !== 'free-forever';

      // 5. Create account via gRPC
      const [hashedPassword, profileResponse] = await Promise.all([
        bcrypt.hash(signupDto.password, 10),
        firstValueFrom(profileGrpcService.createIndividualAccountWithProfiles(createAccountDto))
      ]);

      if (!profileResponse || !profileResponse.data) {
        await this.queue.incrementRateLimit(
          signupDto.email,
          'signup_attempts',
          signupLimit.maxAttempts,
          signupLimit.windowSeconds
        );

        this.logger.error(`[PROFILE FAIL] ${signupDto.email}: ${profileResponse.message}`);

        await this.queue.addJob(
          'analytics-queue',
          'signup-failed',
          {
            email: signupDto.email,
            reason: 'PROFILE_CREATION_FAILED',
            error: profileResponse.message,
            clientInfo: clientInfo ? {
              device: clientInfo.device,
              deviceType: clientInfo.deviceType,
              os: clientInfo.os,
              browser: clientInfo.browser,
              isBot: clientInfo.isBot,
              browserVersion: clientInfo.browserVersion,
              osVersion: clientInfo.osVersion
            } : null,
            timestamp: new Date().toISOString()
          },
          {
            attempts: 2,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: true,
            removeOnFail: true,
          }
        );

        return BaseResponseDto.fail(
          profileResponse.message,
          profileResponse.code,
          profileResponse.error
        );
      }

      const accountData = profileResponse.data;
      const userData = accountData.users?.[0];

      if (!userData) {
        await this.queue.incrementRateLimit(
          signupDto.email,
          'signup_attempts',
          signupLimit.maxAttempts,
          signupLimit.windowSeconds
        );

        this.logger.error(`[PROFILE RESPONSE] No user found in account data for ${signupDto.email}`);
        return BaseResponseDto.fail('Invalid response from profile service', 'INTERNAL_ERROR');
      }

      const roleType = accountData.userRole || 'GeneralUser';

      // 6. Save credentials with accountUuid
      await this.prisma.credential.create({
        data: {
          userUuid: userData.uuid,
          accountUuid: accountData.uuid,
          passwordHash: hashedPassword,
          email: signupDto.email,
          phone: signupDto.phone || null,
          mfaEnabled: true,
          accountStatus: isPremium ? 'PENDING_PAYMENT' : 'ACTIVE',
          role: roleType,
        },
      });

      // 7. Reset rate limit on successful signup
      await this.queue.resetRateLimit(signupDto.email, 'signup_attempts');

      // ============ PREMIUM BRANCH: PAYMENT HAND-OFF ============
      if (isPremium && profileResponse.code === 'PAYMENT_REQUIRED') {
        return await this.handlePremiumSignup(
          accountData,
          userData,
          signupDto,
          targetPlanSlug,
          profileType
        );
      }

      // ============ FREE PLAN - Queue Background Jobs ============
      await this.queueBackgroundJobs(signupDto, accountData, userData, profileType, profileDataForEmail, targetPlanSlug);

      // ============ FETCH PROFESSIONAL ID AFTER PROFILE CREATION ============
      const professionalId = await this.getProfessionalId(accountData.uuid, profileType);

      // ============ GENERATE TOKENS ============
      const tokenId = `${userData.uuid}-${Date.now()}`;
      const now = Math.floor(Date.now() / 1000);

      const payload: JwtPayload = {
        sub: userData.uuid,
        jti: tokenId,
        iat: now,
        email: signupDto.email,
        accountId: accountData.uuid,
        role: roleType,
        accountType: 'INDIVIDUAL',
        organizationUuid: null,
        planSlug: targetPlanSlug,
        professionalId,
      };

      this.logger.log(`📋 Generating JWT with professionalId: ${professionalId || 'none'}`);

      const accessToken = await this.jwtService.signAsync(payload, { expiresIn: '15m' });
      const refreshToken = await this.jwtService.signAsync(payload, { expiresIn: '7d' });

      const hashedToken = await bcrypt.hash(refreshToken, 10);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await this.prisma.session.create({
        data: {
          userUuid: userData.uuid,
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

      this.logger.log(`✅ Signup completed and tokens generated for: ${signupDto.email}`);

      return BaseResponseDto.ok(
        {
          message: 'Signup successful',
          accessToken,
          refreshToken,
          redirectTo: '/dashboard'
        },
        'Signup successful',
        'CREATED'
      );

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unexpected failure';
      this.logger.error(`[AUTH SIGNUP CRASH] ${errorMessage}`);

      try {
        const signupLimit = getRateLimitConfig('SIGNUP_ATTEMPTS');
        await this.queue.incrementRateLimit(
          signupDto.email,
          'signup_attempts',
          signupLimit.maxAttempts,
          signupLimit.windowSeconds
        );
      } catch (rateError) {
        this.logger.error(`Failed to increment rate limit: ${rateError}`);
      }

      await this.queue.addJob(
        'analytics-queue',
        'signup-error',
        {
          email: signupDto.email,
          error: errorMessage,
          primaryPurpose: signupDto.primaryPurpose,
          profileType: profileType,
          clientInfo: clientInfo ? {
            device: clientInfo.device,
            deviceType: clientInfo.deviceType,
            os: clientInfo.os,
            browser: clientInfo.browser,
          } : null,
          timestamp: new Date().toISOString()
        },
        {
          attempts: 2,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: true,
        }
      );

      return BaseResponseDto.fail(
        errorMessage,
        'INTERNAL_ERROR'
      );
    }
  }

  /**
   * Handle Premium Signup (Payment Required)
   */
/**
 * Handle Premium Signup (Payment Required)
 */
private async handlePremiumSignup(
  accountData: any,
  userData: any,
  signupDto: UserSignupRequestDto,
  targetPlanSlug: string,
  profileType: string | null,
): Promise<BaseResponseDto<SignupResponseDto>> {
  try {
    const paymentPayload = {
      accountUuid: accountData.uuid,
      userUuid: userData.uuid,
      email: signupDto.email,
      firstName: signupDto.firstName,
      lastName: signupDto.lastName,
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

    await this.queue.addJob(
      'onboarding-email-queue',
      'payment-pending-email',
      {
        to: signupDto.email,
        firstName: signupDto.firstName,
        lastName: signupDto.lastName,
        plan: targetPlanSlug,
        redirectUrl: paymentInitResponse.data.redirectUrl,
        merchantReference: paymentInitResponse.data.merchantReference,
        profileType: profileType,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      }
    );

    return BaseResponseDto.ok(
      {
        message: 'Account created. Complete payment to activate.',
        redirectUrl: paymentInitResponse.data.redirectUrl,
        merchantReference: paymentInitResponse.data.merchantReference,
      } as SignupResponseDto,
      'Payment required to activate account',
      'PAYMENT_REQUIRED'
    );

  } catch (paymentErr: unknown) {
    const message = paymentErr instanceof Error ? paymentErr.message : 'Payment service unreachable';
    this.logger.error(`[PAYMENT SERVICE DOWN] User ${signupDto.email}: ${message}`);

    return BaseResponseDto.ok(
      {
        message: 'Account created. Payment system busy. Please login to complete payment.',
        redirectUrl: null,
      },
      'Account created. Payment service offline.',
      'PAYMENT_SERVICE_OFFLINE'
    );
  }
}

  /**
   * Get Professional ID (with retry for newly created profiles)
   */
  private async getProfessionalId(accountUuid: string, profileType: string | null): Promise<string | undefined> {
    if (profileType !== 'SKILLED_PROFESSIONAL') {
      return undefined;
    }

    this.logger.log(`🔍 Fetching professional ID for account ${accountUuid}`);

    const profileGrpc = this.getProfileGrpcService();

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const skilledProfileResponse = await firstValueFrom(
          profileGrpc.getSkilledProfessionalByAccount({ accountUuid })
        );

        if (skilledProfileResponse?.success && skilledProfileResponse?.data?.uuid) {
          const professionalId = skilledProfileResponse.data.uuid;
          this.logger.log(`✅ Retrieved professional ID on attempt ${attempt}: ${professionalId}`);
          await this.redisSession.cacheProfessionalId(accountUuid, professionalId);
          return professionalId;
        }
      } catch (err) {
        this.logger.warn(`Attempt ${attempt} to fetch professional ID failed: ${err.message}`);
      }

      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    this.logger.warn(`⚠️ Could not retrieve professional ID for account ${accountUuid}`);
    return undefined;
  }

  /**
   * Queue background jobs
   */
  private async queueBackgroundJobs(
    signupDto: UserSignupRequestDto,
    accountData: any,
    userData: any,
    profileType: string | null,
    profileDataForEmail: any,
    targetPlanSlug: string
  ): Promise<void> {
    // Welcome email
    await this.queue.addJob(
      'onboarding-email-queue',
      'welcome-email',
      {
        to: signupDto.email,
        firstName: signupDto.firstName,
        lastName: signupDto.lastName,
        accountId: accountData.accountCode,
        plan: targetPlanSlug,
        profileType: profileType,
        profileData: profileDataForEmail,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      }
    );

    // Admin notification
    const adminEmail = process.env.PIVOTA_ADMIN_NOTIFICATION_EMAIL || 'onboarding@pivotaconnect.com';
    await this.queue.addJob(
      'onboarding-email-queue',
      'admin-notification',
      {
        to: adminEmail,
        userEmail: signupDto.email,
        userName: `${signupDto.firstName} ${signupDto.lastName}`,
        accountType: 'INDIVIDUAL',
        registrationMethod: 'EMAIL',
        registrationDate: new Date().toISOString(),
        plan: targetPlanSlug,
        primaryPurpose: signupDto.primaryPurpose || 'JUST_EXPLORING',
        profileType: profileType,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      }
    );

    // Analytics
    await this.queue.addJob(
      'analytics-queue',
      'user-registered',
      {
        userUuid: userData.uuid,
        email: signupDto.email,
        accountId: accountData.accountCode,
        plan: targetPlanSlug,
        primaryPurpose: signupDto.primaryPurpose || 'JUST_EXPLORING',
        profileType: profileType,
        hasProfileData: !!profileType,
        signupSource: {
          device: 'web',
          timestamp: new Date().toISOString()
        }
      },
      {
        attempts: 2,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: true,
      }
    );
  }

  /**
   * Handle Google Sign-Up (New User via Google)
   */
  async handleGoogleSignup(
    payload: any,
    onboardingData: any,
    clientInfo?: AuthClientInfoDto
  ): Promise<{
    userUuid: string;
    accountUuid: string;
    professionalId?: string;
    isNewUser: boolean;
  }> {
    const { sub: googleProviderId, email } = payload;
    const firstName = payload?.given_name || 'User';
    const lastName = payload?.family_name || '';
    const profileImage = payload?.picture?.replace('=s96-c', '=s400-c') || null;

    this.logger.log(`[Google] Creating new user: ${email}`);

    const createAccountDto: any = {
      accountType: 'INDIVIDUAL',
      email: email,
      password: '',
      phone: null,
      planSlug: 'free-forever',
      otpCode: '',
      firstName: firstName,
      lastName: lastName,
      profileImage: profileImage,
      primaryPurpose: onboardingData?.primaryPurpose,
      jobSeekerData: onboardingData?.jobSeekerData,
      housingSeekerData: onboardingData?.housingSeekerData,
      skilledProfessionalData: onboardingData?.skilledProfessionalData,
      intermediaryAgentData: onboardingData?.intermediaryAgentData,
      supportBeneficiaryData: onboardingData?.supportBeneficiaryData,
      employerData: onboardingData?.employerData,
      propertyOwnerData: onboardingData?.propertyOwnerData,
      profiles: [],
      skipEventEmission: true,
    };

    const profileGrpc = this.getProfileGrpcService();
    const createResponse = await firstValueFrom(
      profileGrpc.createIndividualAccountWithProfiles(createAccountDto)
    );

    if (!createResponse.success || !createResponse.data) {
      this.logger.error(`[Google] Profile creation failed: ${createResponse.message}`);
      throw new Error('Profile creation failed');
    }

    const accountData = createResponse.data;
    const userData = accountData.users?.[0];

    if (!userData) {
      throw new Error('No user found in created account');
    }

    const userUuid = userData.uuid;
    const accountUuid = accountData.uuid;

    // Get professional ID if exists
    let professionalId: string | undefined;
    if (accountData.skilledProfessionalProfile?.uuid) {
      professionalId = accountData.skilledProfessionalProfile.uuid;
      await this.redisSession.cacheProfessionalId(userUuid, professionalId);
    }

    // Create credential
    await this.prisma.credential.create({
      data: {
        userUuid,
        accountUuid,
        email,
        googleProviderId,
        mfaEnabled: true,
        passwordHash: null,
        accountStatus: 'ACTIVE',
      },
    });

    // Cache credential
    await this.redisSession.cacheCredential(email, {
      userUuid,
      accountUuid,
      accountStatus: 'ACTIVE',
      role: 'Individual',
      email,
    });

    // Queue notifications
    const profileType = onboardingData?.primaryPurpose
      ? this.mapPurposeToProfileType(onboardingData.primaryPurpose)
      : null;

    const profileDataForEmail = this.extractProfileDataForEmail(
      onboardingData?.primaryPurpose,
      onboardingData
    );

    // Fire and forget notifications
    Promise.all([
      this.queue.addJob('onboarding-email-queue', 'welcome-email', {
        to: email,
        accountId: accountData.accountCode,
        firstName: firstName,
        lastName: lastName,
        plan: 'Free Forever',
        profileType: profileType,
        profileData: profileDataForEmail,
      }, { removeOnComplete: true }),
      this.queue.addJob('onboarding-email-queue', 'admin-notification', {
        to: process.env.ADMIN_NOTIFICATION_EMAIL || 'onboarding@pivotaconnect.com',
        userEmail: email,
        userName: `${firstName} ${lastName}`.trim(),
        accountType: 'INDIVIDUAL',
        registrationMethod: 'GOOGLE',
        registrationDate: new Date().toISOString(),
        plan: 'Free Forever',
        primaryPurpose: onboardingData?.primaryPurpose || 'JUST_EXPLORING',
        profileType: profileType,
      }, { removeOnComplete: true }),
      this.queue.addJob('analytics-queue', 'user-registered', {
        userUuid,
        email,
        accountId: accountData.accountCode,
        plan: 'free-forever',
        registrationMethod: 'GOOGLE',
        primaryPurpose: onboardingData?.primaryPurpose || 'JUST_EXPLORING',
        profileType: profileType,
        hasProfileData: !!profileType,
        signupSource: {
          device: clientInfo?.device || 'unknown',
          deviceType: clientInfo?.deviceType,
          os: clientInfo?.os,
          osVersion: clientInfo?.osVersion,
          browser: clientInfo?.browser,
          browserVersion: clientInfo?.browserVersion,
          isBot: clientInfo?.isBot,
          timestamp: new Date().toISOString()
        }
      }, { removeOnComplete: true })
    ]).catch(err => this.logger.error(`Failed to queue notifications: ${err.message}`));

    this.logger.log(`✅ Google signup completed for: ${email}`);

    return {
      userUuid,
      accountUuid,
      professionalId,
      isNewUser: true,
    };
  }

  /**  
   * 
   * Map primary purpose to profile type
   */
  private mapPurposeToProfileType(primaryPurpose: string): string | null {
    const purposeMap: Record<string, string> = {
      'FIND_JOB': 'JOB_SEEKER',
      'OFFER_SKILLED_SERVICES': 'SKILLED_PROFESSIONAL',
      'WORK_AS_AGENT': 'INTERMEDIARY_AGENT',
      'FIND_HOUSING': 'HOUSING_SEEKER',
      'GET_SOCIAL_SUPPORT': 'SUPPORT_BENEFICIARY',
      'HIRE_EMPLOYEES': 'EMPLOYER',
      'LIST_PROPERTIES': 'PROPERTY_OWNER',
    };
    return purposeMap[primaryPurpose] || null;
  }

  /**
   * Extract profile data for email
   */
  private extractProfileDataForEmail(primaryPurpose: string | undefined, onboardingData: any): any {
    if (!primaryPurpose) return null;

    switch (primaryPurpose) {
      case 'FIND_JOB':
        return onboardingData?.jobSeekerData;
      case 'OFFER_SKILLED_SERVICES':
        return onboardingData?.skilledProfessionalData;
      case 'WORK_AS_AGENT':
        return onboardingData?.intermediaryAgentData;
      case 'FIND_HOUSING':
        return onboardingData?.housingSeekerData;
      case 'GET_SOCIAL_SUPPORT':
        return onboardingData?.supportBeneficiaryData;
      case 'HIRE_EMPLOYEES':
        return onboardingData?.employerData;
      case 'LIST_PROPERTIES':
        return onboardingData?.propertyOwnerData;
      default:
        return null;
    }
  }
}