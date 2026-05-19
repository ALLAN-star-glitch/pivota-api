/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Injectable,
  Logger,
  UnauthorizedException,
  OnModuleInit,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ClientGrpc, ClientProxy } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import { ExtendedPrismaClient, PrismaService } from '../../prisma/prisma.service';
import {
  LoginResponseDto,
  LoginRequestDto,
  SessionDto,
  TokenPairDto,
  BaseResponseDto,
  GetUserByUserUuidDto,
  RoleResponseDto,
  CreateOrganisationRequestDto,
  OrganizationProfileResponseDto,
  OrganizationSignupDataDto,
  OrganisationSignupRequestDto,
  UserSignupRequestDto,
  UserProfileResponseDto,
  VerifyOtpDto,
  RequestOtpDto,
  ResetPasswordDto,
  SetupPasswordRequestDto,
  AuthClientInfoDto,
  CreateAccountWithProfilesRequestDto,
  AccountResponseDto,
  SignupResponseDto,
  GoogleLoginRequestDto,
  SyncUserRoleResponseDto,
} from '@pivota-api/dtos';
import { firstValueFrom, lastValueFrom, Observable } from 'rxjs';
import { BaseGetUserRoleReponseGrpc, JwtPayload } from '@pivota-api/interfaces';
import { randomUUID } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import * as dotenv from 'dotenv';
import { HttpService } from '@nestjs/axios';
import { getRateLimitConfig, OtpPurpose, QueueService, RedisService, RedisSessionService } from '@pivota-api/shared-redis';



dotenv.config({ path: `.env.${process.env.NODE_ENV || 'dev'}` });

// ---------------- gRPC Interfaces ----------------
interface ProfileServiceGrpc {
  // Individual account creation with profiles (UPDATED)
  createIndividualAccountWithProfiles(
    data: CreateAccountWithProfilesRequestDto
  ): Observable<BaseResponseDto<AccountResponseDto>>;

  // Organization account creation with profiles
  createOrganizationAccountWithProfiles(
    data: CreateOrganisationRequestDto,
  ): Observable<BaseResponseDto<OrganizationProfileResponseDto>>;

  // Profile retrieval methods
  getUserProfileByEmail(data: { email: string }): Observable<BaseResponseDto<UserProfileResponseDto> | null>;
  getUserProfileByUuid(data: GetUserByUserUuidDto): Observable<BaseResponseDto<UserProfileResponseDto> | null>;

  updateProfilePicture(data: {
    accountUuid: string;
    pictureUrl: string;
    oldImageUrl?: string | null;
  }): Observable<BaseResponseDto<null>>;
}

interface RbacServiceGrpc {
  getUserRole(data: GetUserByUserUuidDto): Observable<BaseGetUserRoleReponseGrpc<RoleResponseDto> | null>;
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private profileGrpcService: ProfileServiceGrpc;
  private rbacGrpcService: RbacServiceGrpc;
  private readonly googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
   private prisma: ExtendedPrismaClient;
 


  constructor(
  private readonly jwtService: JwtService,
  private readonly prismaService: PrismaService,
  private readonly httpService: HttpService,
  private readonly redisSession: RedisSessionService,
  private queue: QueueService,
  
  // gRPC Clients
  @Inject('PROFILE_GRPC')
   private readonly grpcClient: ClientGrpc,
   
  @Inject('RBAC_PACKAGE') 
  private readonly rbacClient: ClientGrpc,

  @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientProxy, 

  @Inject('NOTIFICATION_EVENT_BUS') private readonly notificationBus: ClientProxy,

   private readonly redisService: RedisService,
) {
  this.prisma = this.prismaService.prisma;
}

  onModuleInit() {
    this.profileGrpcService = this.grpcClient.getService<ProfileServiceGrpc>('ProfileService');
    this.logger.log('AuthService initialized (gRPC)');
    this.rbacGrpcService = this.rbacClient.getService<RbacServiceGrpc>('RbacService');
    this.logger.log('RbacService initialized (gRPC)');
  }

  private getProfileGrpcService(): ProfileServiceGrpc {
    if (!this.profileGrpcService) {
      this.profileGrpcService = this.grpcClient.getService<ProfileServiceGrpc>('ProfileService');
    }
    return this.profileGrpcService;
  }

  private getRbacGrpcService(): RbacServiceGrpc {
    if (!this.rbacGrpcService) {
      this.rbacGrpcService = this.rbacClient.getService<RbacServiceGrpc>('RbacService');
    }
    return this.rbacGrpcService;
  }

  

 /** ------------------ Validate User ------------------ */

async validateUser(
  email: string, 
  password: string, 
  organizationUuid?: string
): Promise<{ 
  userUuid: string; 
  accountUuid: string; 
  email: string; 
  status: string;
  accountStatus: string;
  memberStatus?: string;
  isOrganizationMember: boolean;
} | null> {
  const MAX_FAILED_ATTEMPTS = 5;
  const LOCKOUT_DURATION_MINUTES = 15;

  try {
    // 1. Check lockout status FIRST (must be real-time, never cached)
    const lockoutKey = `lockout:${email}`;
    const isLocked = await this.redisService.exists(lockoutKey);
    if (isLocked) {
      const ttl = await this.redisService.getTTL(lockoutKey);
      const minutesLeft = Math.ceil(ttl / 60);
      this.logger.warn(`[AUTH] Blocked: ${email} locked for ${minutesLeft} mins.`);
      throw new UnauthorizedException(`Account locked. Try again in ${minutesLeft} minutes.`);
    }

    // 2. Get FRESH security data from DB (password hash, failed attempts)
    const credential = await this.prisma.credential.findUnique({
      where: { email },
      select: {
        id: true,
        userUuid: true,
        accountUuid: true,
        email: true,
        passwordHash: true,
        failedAttempts: true,
        lockoutExpires: true,
        accountStatus: true,
        memberStatus: true,
        role: true,
      }
    });

    if (!credential) {
      this.logger.warn(`[AUTH] Login attempt failed: ${email} not found.`);
      return null;
    }

    // 3. Check DB lockout expires
    if (credential.lockoutExpires && credential.lockoutExpires > new Date()) {
      const remainingTime = Math.ceil((credential.lockoutExpires.getTime() - Date.now()) / 60000);
      this.logger.warn(`[AUTH] Blocked: ${email} locked for ${remainingTime} mins.`);
      throw new UnauthorizedException(`Account locked. Try again in ${remainingTime} minutes.`);
    }

    // 4. Verify password (MUST be fresh, never cached)
    const isValid = await bcrypt.compare(password, credential.passwordHash);
    
    if (!isValid) {
      const newFailedAttempts = credential.failedAttempts + 1;
      
      if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
        // Lock account in Redis (fast, real-time)
        await this.redisService.setEx(lockoutKey, '1', LOCKOUT_DURATION_MINUTES * 60);
        
        // Also update DB
        await this.prisma.credential.update({
          where: { id: credential.id },
          data: { 
            failedAttempts: newFailedAttempts,
            lockoutExpires: new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60000)
          },
        });
      } else {
        await this.prisma.credential.update({
          where: { id: credential.id },
          data: { failedAttempts: newFailedAttempts },
        });
      }
      return null;
    }

    // 5. Password is valid - cache SAFE data for future use
    await this.redisSession.cacheCredential(email, {
      userUuid: credential.userUuid,
      accountUuid: credential.accountUuid,
      accountStatus: credential.accountStatus,
      memberStatus: credential.memberStatus,
      role: credential.role,
      email: credential.email,
    });

    // 6. Reset security fields on success
    await Promise.all([
      this.prisma.credential.update({
        where: { id: credential.id },
        data: { 
          lastLoginAt: new Date(),
          failedAttempts: 0,
          lockoutExpires: null 
        },
      }),
      this.redisService.delete(lockoutKey), // Clear Redis lockout
      this.redisService.delete(`failed:${email}`), // Clear failed attempts cache
    ]);

    // Determine login context
    let effectiveStatus: string;
    let isOrganizationMember = false;

    if (organizationUuid) {
      if (!credential.memberStatus) {
        this.logger.warn(`[AUTH] User ${email} is not a member of any organization`);
        throw new UnauthorizedException('You are not a member of any organization.');
      }
      effectiveStatus = credential.memberStatus;
      isOrganizationMember = true;
    } else {
      effectiveStatus = credential.accountStatus;
    }

    if (effectiveStatus !== 'ACTIVE') {
      const statusMessage = effectiveStatus.toLowerCase();
      this.logger.warn(`[AUTH] Blocked: ${email} account is ${statusMessage}`);
      
      if (effectiveStatus === 'PENDING_PAYMENT') {
        throw new UnauthorizedException('Please complete payment to activate your account.');
      }
      throw new UnauthorizedException(`Your account is ${statusMessage}.`);
    }

    this.logger.log(`[AUTH] User validated successfully: ${email}`);

    return {
      userUuid: credential.userUuid,
      accountUuid: credential.accountUuid,
      email: credential.email,
      status: effectiveStatus,
      accountStatus: credential.accountStatus,
      memberStatus: credential.memberStatus || undefined,
      isOrganizationMember,
    };

  } catch (err: unknown) {
    if (err instanceof UnauthorizedException) throw err;
    
    this.logger.error('[AUTH] Critical error in validateUser flow');
    if (err instanceof Error) {
      this.logger.error(`[DETAILS] ${err.message}`);
    }
    return null;
  }
}

  /** ------------------ Generate Tokens ------------------ */
async generateTokens(
  profile: UserProfileResponseDto,
  clientInfo?: AuthClientInfoDto
): Promise<{ accessToken: string; refreshToken: string }> {
  const userData = profile.user;
  const accountData = profile.account;
  const orgData = profile.organization;

  this.logger.debug(`[AUTH] Generating tokens for User: ${userData.uuid} in Account: ${accountData.uuid}`);

  // 1. Fetch the User Role via gRPC
  const rbacService = this.getRbacGrpcService();
  const userRoleResponse = await firstValueFrom(
    rbacService.getUserRole({ userUuid: userData.uuid }),
  );
  const roleType = userRoleResponse?.role?.roleType ?? 'Individual';

  const tokenId = `${userData.uuid}-${Date.now()}`;
  const now = Math.floor(Date.now() / 1000);

  // 2. Prepare JWT Payload with standard claims
  const payload: JwtPayload = {
    // Standard claims (RFC 7519)
    sub: userData.uuid,
    jti: tokenId,
    iat: now,
    
    // Custom claims
    email: userData.email,
    accountId: accountData.uuid,
    role: roleType,
    accountType: accountData.type as 'INDIVIDUAL' | 'ORGANIZATION',
    organizationUuid: orgData?.uuid,
  };

  // 3. Sign Access and Refresh Tokens
  const accessToken = await this.jwtService.signAsync(payload, { expiresIn: '15m' });
  const refreshToken = await this.jwtService.signAsync(payload, { expiresIn: '7d' });

  // 4. Security: Hash the Refresh Token
  const hashedToken = await bcrypt.hash(refreshToken, 10);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // 5. CREATE SESSION WITH ALL CLIENT INFO FIELDS
  await this.prisma.session.create({
    data: {
      userUuid: userData.uuid,
      tokenId: tokenId,
      hashedToken,
      
      // Basic client info
      device: clientInfo?.device,
      ipAddress: clientInfo?.ipAddress,
      userAgent: clientInfo?.userAgent,
      os: clientInfo?.os,
      
      // Rich client info fields
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

  this.logger.debug(`[AUTH] Session ${tokenId} created for User: ${userData.uuid}`);
  
  // Log rich client info for debugging
  if (clientInfo) {
    this.logger.debug(`[AUTH] Client: ${clientInfo.device} (${clientInfo.deviceType}), OS: ${clientInfo.os} ${clientInfo.osVersion}, Browser: ${clientInfo.browser}`);
  }

  return { accessToken, refreshToken };
}


/* ======================================================
   INDIVIDUAL SIGNUP (With Transactional OTP Verification & Auto-Login)
====================================================== */
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
    const verificationResult = await this.verifyOtp({
      email: signupDto.email,
      code: signupDto.code,
      purpose: 'EMAIL_VERIFICATION',
    });

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

    // Map profile data (keep as is)
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

    // ============ PREMIUM BRANCH: PAYMENT HAND-OFF (keep as is) ============
    if (isPremium && profileResponse.code === 'PAYMENT_REQUIRED') {
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
          'email-queue',
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

    // ============ FREE PLAN - QUEUE BACKGROUND JOBS (keep as is) ============
    
    await this.queue.addJob(
      'email-queue',
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

    const adminEmail = process.env.PIVOTA_ADMIN_NOTIFICATION_EMAIL || 'onboarding@pivotaconnect.com';
    await this.queue.addJob(
      'email-queue',
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
        signupSource: clientInfo ? {
          device: clientInfo.device,
          deviceType: clientInfo.deviceType,
          os: clientInfo.os,
          osVersion: clientInfo.osVersion,
          browser: clientInfo.browser,
          browserVersion: clientInfo.browserVersion,
          isBot: clientInfo.isBot,
          timestamp: new Date().toISOString()
        } : null
      },
      {
        attempts: 2,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: true,
      }
    );

    // ✅ Generate tokens with standard JWT claims
    const tokenId = `${userData.uuid}-${Date.now()}`;
    const now = Math.floor(Date.now() / 1000);


    const payload: JwtPayload = {
      // Standard claims
      sub: userData.uuid,
      jti: tokenId,
      iat: now,
      
      // Custom claims
      email: signupDto.email,
      accountId: accountData.uuid,
      role: roleType,
      accountType: 'INDIVIDUAL',
      organizationUuid: null,
      planSlug: targetPlanSlug,
    };

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

// ------------------ Organisation Signup ------------------
/* ======================================================
   ORGANISATION SIGNUP (Updated with OTP Guard)
====================================================== */
async organisationSignup(
  dto: OrganisationSignupRequestDto,
  clientInfo?: AuthClientInfoDto
): Promise<BaseResponseDto<OrganizationSignupDataDto>> {
  this.logger.log(`🏢 Org Signup: ${dto.name} from ${clientInfo?.device || 'Unknown'}`);

  if (clientInfo) {
    this.logger.debug(`Org signup client - Device: ${clientInfo.device}, Type: ${clientInfo.deviceType}, OS: ${clientInfo.os} ${clientInfo.osVersion || ''}, Browser: ${clientInfo.browser} ${clientInfo.browserVersion || ''}, Bot: ${clientInfo.isBot}`);
  }

  try {
    // 1. VERIFY OTP
    const validOtp = await this.prisma.otp.findFirst({
      where: {
        email: dto.email,
        code: dto.code,
        purpose: 'ORGANIZATION_SIGNUP',
        expiresAt: { gt: new Date() },
      },
    });

    if (!validOtp) {
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

    // 5. CLEANUP OTP
    await this.prisma.otp.deleteMany({
      where: { email: dto.email, purpose: 'ORGANIZATION_SIGNUP' }
    });

    /* ======================================================
       6. PREMIUM BRANCH: PAYMENT HAND-OFF
    ====================================================== */
    if (isPremium && orgResponse.code === 'PAYMENT_REQUIRED') {
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

    /* ======================================================
       7. NOTIFICATIONS & ANALYTICS
    ====================================================== */

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
      adminUserUuid,
      adminEmail: dto.email,
      accountId: accountData.accountCode,
      plan: targetPlanSlug,
      purposes: dto.purposes || [],
      signupSource: {
        device: clientInfo?.device,
        deviceType: clientInfo?.deviceType,
        os: clientInfo?.os,
        osVersion: clientInfo?.osVersion,
        browser: clientInfo?.browser,
        browserVersion: clientInfo?.browserVersion,
        isBot: clientInfo?.isBot,
        timestamp: new Date().toISOString()
      }
    });

    // ✅ Generate tokens for auto-login with standard JWT claims
    const tokenId = `${adminUserUuid}-${Date.now()}`;
    const now = Math.floor(Date.now() / 1000);
    const roleType = 'OrganizationAdmin';
    
    const payload: JwtPayload = {
      // Standard claims
      sub: adminUserUuid,
      jti: tokenId,
      iat: now,
  
      
      // Custom claims
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

    this.logger.log(`✅ Organization signup completed with auto-login for: ${dto.email}`);

    // 8. Return Success Response with tokens
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

// ------------------ Unified Login (Optimized) ------------------
async login(
  loginDto: LoginRequestDto,
): Promise<BaseResponseDto<LoginResponseDto>> {
  const startTime = Date.now();
  this.logger.debug(`Login attempt for: ${loginDto.email}`);

  try {
    // 1. Check rate limit (fast - Redis)
    const loginLimit = getRateLimitConfig('LOGIN_ATTEMPTS');
    const rateLimitResult = await this.queue.checkRateLimit(
      loginDto.email,
      'login_attempts',
      loginLimit.maxAttempts,
      loginLimit.windowSeconds
    );
    
    if (!rateLimitResult.allowed) {
      const minutesLeft = Math.ceil(rateLimitResult.resetInSeconds / 60);
      return BaseResponseDto.fail(
        loginLimit.errorMessage(minutesLeft),
        'TOO_MANY_REQUESTS'
      );
    }
    
    // 2. Validate credentials (optimized - single DB query, no gRPC)
    const validatedUser = await this.validateUser(loginDto.email, loginDto.password);

    if (!validatedUser) {
      await this.queue.incrementRateLimit(
        loginDto.email,
        'login_attempts',
        loginLimit.maxAttempts,
        loginLimit.windowSeconds
      );
      throw new UnauthorizedException('Invalid email or password');
    }

    // 3. Reset rate limit on success
    await this.queue.resetRateLimit(loginDto.email, 'login_attempts');

    // 4. Queue OTP in background (non-blocking)
    // Don't await - let it run in background
    this.queueOtpInBackground(loginDto.email, 'LOGIN_2FA').catch(err => {
      this.logger.error(`Background OTP failed for ${loginDto.email}: ${err.message}`);
    });

    const elapsed = Date.now() - startTime;
    this.logger.log(`Login stage 1 completed in ${elapsed}ms for: ${loginDto.email}`);

    // 5. Return immediately (don't wait for OTP)
    return BaseResponseDto.ok(
      { 
        message: 'MFA_REQUIRED',
        email: validatedUser.email,
        uuid: validatedUser.userUuid
      } as LoginResponseDto,
      'MFA_REQUIRED',
      '2FA_PENDING'
    );

  } catch (err: unknown) {
    this.logger.error(`Login failed for ${loginDto.email}`, err instanceof Error ? err.message : err);

    if (err instanceof UnauthorizedException) {
      return BaseResponseDto.fail(
        err.message,
        'UNAUTHORIZED',
        { code: 'AUTH_FAILURE', message: err.message }
      );
    }

    return BaseResponseDto.fail(
      'Internal server error',
      'INTERNAL_ERROR',
      { code: 'INTERNAL', message: err instanceof Error ? err.message : 'Login failed' }
    );
  }
}

// Add this helper method to queue OTP in background
private async queueOtpInBackground(email: string, purpose: string): Promise<void> {
  // Generate OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60000);
  const now = new Date();
  
  // ✅ Store in Redis FIRST (fast lookup for verification)
  const redisKey = `otp:${email}:${purpose}`;
  await this.redisService.setEx(redisKey, otpCode, 600); // 10 minutes TTL
  
  // ✅ Store in database (for persistence/fallback)
  await this.prisma.otp.upsert({
    where: {
      email_purpose: { email, purpose }
    },
    update: { code: otpCode, expiresAt, createdAt: now },
    create: { email, code: otpCode, purpose, expiresAt, createdAt: now },
  });
  
  // Queue email sending (fire and forget - don't await)
  this.queue.addJob(
    'email-queue',
    'send-otp',
    {
      to: email,
      code: otpCode,
      purpose: purpose,
    },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: false,
    }
  ).catch(err => this.logger.error(`Failed to queue OTP email: ${err.message}`));
  
  this.logger.debug(`OTP ${otpCode} stored in Redis and DB for ${email}`);
}


  // ------------------ Refresh Token ------------------
async refreshToken(refreshToken: string): Promise<BaseResponseDto<TokenPairDto>> {
  const startTime = Date.now();
  
  if (!refreshToken) {
    throw new UnauthorizedException('Refresh token is required');
  }

  try {
    // 1. Decode token to get tokenId
    const decoded = this.jwtService.decode(refreshToken) as JwtPayload;
    if (!decoded?.jti || !decoded?.sub) {
      throw new UnauthorizedException('Invalid token structure');
    }

    const { jti: tokenId, sub: userUuid } = decoded;
    this.logger.log(`🔄 Refreshing token for user: ${userUuid}, tokenId: ${tokenId}`);

    // 2. Try Redis first, fallback to Database
    const session = await this.redisSession.getSession(tokenId);
    let isValid = false;
    
    if (session) {
      // Validate in Redis
      const bcrypt = require('bcrypt');
      isValid = await bcrypt.compare(refreshToken, session.refreshTokenHash);
      this.logger.debug(`Redis validation result: ${isValid}`);
    }
    
    // Fallback to Database if Redis doesn't have it or validation failed
    if (!isValid) {
      this.logger.warn(`Redis validation failed, checking database...`);
      const dbSession = await this.prisma.session.findUnique({
        where: { tokenId },
        select: { hashedToken: true, revoked: true, expiresAt: true, userUuid: true }
      });
      
      if (dbSession && !dbSession.revoked && dbSession.expiresAt > new Date()) {
        const bcrypt = require('bcrypt');
        isValid = await bcrypt.compare(refreshToken, dbSession.hashedToken);
        
        if (isValid) {
          // Restore to Redis for next time
          await this.redisSession.storeSession(
            tokenId,
            dbSession.userUuid,
            dbSession.hashedToken,
            null
          );
          this.logger.debug(`Session restored to Redis from database`);
        }
      }
    }
    
    if (!isValid) {
      this.logger.warn(`Invalid refresh token: ${tokenId}`);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // 3. Check blacklist
    const isBlacklisted = await this.redisSession.isBlacklisted(tokenId);
    if (isBlacklisted) {
      this.logger.warn(`Token is blacklisted: ${tokenId}`);
      throw new UnauthorizedException('Token has been revoked');
    }

    // 4. Get user profile (from cache or gRPC)
    let profileData = await this.redisSession.getCachedUserProfile(userUuid);
    if (!profileData) {
      const profileGrpc = this.getProfileGrpcService();
      const profileResponse = await firstValueFrom(
        profileGrpc.getUserProfileByUuid({ userUuid })
      );
      
      if (!profileResponse?.success || !profileResponse?.data) {
        throw new UnauthorizedException('User profile not found');
      }
      
      profileData = profileResponse.data;
      await this.redisSession.cacheUserProfile(userUuid, profileData);
    }

    // 5. Generate new tokens
    const newTokenId = `${userUuid}-${Date.now()}`;
    const now = Math.floor(Date.now() / 1000);
    
    const payload: JwtPayload = {
      sub: userUuid,
      jti: newTokenId,
      iat: now,
      email: profileData.user?.email,
      accountId: profileData.account?.uuid,
      role: profileData.user?.role || 'Individual',
      accountType: profileData.account?.type || 'INDIVIDUAL',
      organizationUuid: profileData.organization?.uuid || null,
    };

    const [newAccessToken, newRefreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: '15m' }),
      this.jwtService.signAsync(payload, { expiresIn: '7d' })
    ]);

    // 6. Hash new refresh token
    const hashedNewToken = await bcrypt.hash(newRefreshToken, 10);
    const clientInfo = session?.clientInfo ? JSON.parse(session.clientInfo) : null;

    // 7. Rotate token in Redis
    await this.redisSession.rotateToken(
      tokenId,
      newTokenId,
      userUuid,
      hashedNewToken,
      clientInfo
    );

    // 8. Queue DB sync for eventual consistency
    await this.queue.addJob(
      'db-sync',
      'session-rotation',
      {
        oldTokenId: tokenId,
        newTokenId: newTokenId,
        userUuid: userUuid,
        newRefreshTokenHash: hashedNewToken,
        clientInfo: clientInfo,
        timestamp: new Date().toISOString(),
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
      }
    );

    const elapsed = Date.now() - startTime;
    this.logger.log(`✅ Token refresh completed in ${elapsed}ms for user: ${userUuid}`);

    return BaseResponseDto.ok(
      { accessToken: newAccessToken, refreshToken: newRefreshToken },
      'Tokens refreshed successfully',
      'OK'
    );

  } catch (err: any) {
    this.logger.error(`Refresh token error: ${err.message}`);
    
    if (err instanceof UnauthorizedException) {
      return BaseResponseDto.fail(err.message, 'UNAUTHORIZED');
    }
    
    return BaseResponseDto.fail('Token refresh failed', 'INTERNAL_ERROR');
  }
}

async signInWithGoogle(
  clientInfo?: AuthClientInfoDto,
  googleLoginRequest?: GoogleLoginRequestDto
): Promise<BaseResponseDto<LoginResponseDto>> {
  const startTime = Date.now();
  
  try {
    const profileGrpc = this.getProfileGrpcService();
    
    const token = googleLoginRequest?.token;
    const onboardingData = googleLoginRequest?.onboardingData;
    
    if (!token) {
      throw new UnauthorizedException('Google token is required');
    }
    
    // 1. VERIFY GOOGLE TOKEN - WITH CACHING
    this.logger.log('🔍 [Google Auth] Verifying Google token...');
    
    // Try cache first (saves 500-800ms for repeated requests)
    const cacheKey = `google_token:${token.substring(0, 50)}`;
    let payload = await this.redisService.getObject(cacheKey);
    
    if (!payload) {
      // Cache miss - verify with Google
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: [
          process.env.GOOGLE_CLIENT_ID,
          '407408718192.apps.googleusercontent.com',
          '759373816085-4o3n6e05g7ck3k6nb3f016c4civles7h.apps.googleusercontent.com'
        ]
      });
      
      payload = ticket.getPayload();
      
      if (payload && payload.email) {
        // Cache for 60 seconds (short TTL for security)
        await this.redisService.setObject(cacheKey, payload, 60);
        this.logger.debug(`Google token cached for ${payload.email}`);
      }
    } else {
      this.logger.debug(`✅ Google token cache HIT for ${payload.email}`);
    }
    
    if (!payload || !payload.email) {
      throw new UnauthorizedException('Invalid Google token');
    }

    const { sub: googleProviderId, email } = payload;
    let userUuid: string;
    let accountUuid: string;
    let isNewUser = false;
    let accountStatus = 'ACTIVE';
    let firstName = payload?.given_name || 'User';
    let lastName = payload?.family_name || '';
    const profileImage = payload?.picture?.replace('=s96-c', '=s400-c') || null;

    // Clean up names
    if (firstName === 'undefined' || firstName === 'null') firstName = 'User';
    if (lastName === 'undefined' || lastName === 'null') lastName = '';

    this.logger.log(`🔍 [Google Auth] Processing Google login for: ${email}`);

    // 2. CHECK IF CREDENTIAL EXISTS - Try cache first
    let existingCredential = await this.redisSession.getCachedCredential(email);
    let credentialId: string | undefined;
    
    if (!existingCredential) {
      const dbCredential = await this.prisma.credential.findFirst({
        where: {
          OR: [{ googleProviderId }, { email }]
        }
      });
      
      if (dbCredential) {
        existingCredential = {
          userUuid: dbCredential.userUuid,
          accountUuid: dbCredential.accountUuid,
          accountStatus: dbCredential.accountStatus,
          role: dbCredential.role,
          email: dbCredential.email,
        };
        credentialId = dbCredential.id;
        
        await this.redisSession.cacheCredential(email, existingCredential);
      }
    }

    if (existingCredential) {
      // PATH A: EXISTING USER - Login flow
      this.logger.log(`🔍 [Google Auth] Existing user found: ${existingCredential.userUuid}`);
      
      userUuid = existingCredential.userUuid;
      accountUuid = existingCredential.accountUuid;
      accountStatus = existingCredential.accountStatus;
      
      // Link Google ID if not already linked (fire and forget)
      if (!credentialId) {
        const dbCredential = await this.prisma.credential.findUnique({
          where: { userUuid },
          select: { id: true, googleProviderId: true }
        });
        credentialId = dbCredential?.id;
        
        if (dbCredential && !dbCredential.googleProviderId) {
          this.prisma.credential.update({
            where: { id: dbCredential.id },
            data: { googleProviderId }
          }).catch(err => this.logger.error(`Failed to link Google ID: ${err.message}`));
        }
      }
      
      // Profile picture update (fire and forget - already non-blocking)
      const profileObservable = profileGrpc.getUserProfileByUuid({ userUuid });
      firstValueFrom(profileObservable)
        .then(userProfile => {
          const currentProfileImage = userProfile?.data?.profile?.profileImage;
          const hasGooglePicture = profileImage && profileImage.startsWith('https://lh3.googleusercontent.com/');
          
          if (hasGooglePicture && currentProfileImage !== profileImage) {
            this.logger.log(`📸 Google profile picture changed for ${email}`);
            firstValueFrom(
              profileGrpc.updateProfilePicture({
                accountUuid: accountUuid, 
                pictureUrl: profileImage,
                oldImageUrl: currentProfileImage,
              })
            ).catch(err => this.logger.error(`Failed to update profile picture: ${err.message}`));
          }
        })
        .catch(err => this.logger.warn(`Profile fetch failed: ${err.message}`));
      
      // Analytics (fire and forget)
      this.queue.addJob(
        'analytics-queue',
        'user-login',
        {
          userUuid,
          email,
          isNewUser: false,
          loginMethod: 'GOOGLE',
          clientInfo: clientInfo ? {
            device: clientInfo.device,
            deviceType: clientInfo.deviceType,
            os: clientInfo.os,
            osVersion: clientInfo.osVersion,
            browser: clientInfo.browser,
            browserVersion: clientInfo.browserVersion,
            isBot: clientInfo.isBot
          } : null,
          timestamp: new Date().toISOString()
        },
        { attempts: 2, removeOnComplete: true, removeOnFail: false }
      ).catch(err => this.logger.error(`Failed to queue analytics: ${err.message}`));

    } else {
      // PATH B: BRAND NEW USER - Create everything
      isNewUser = true;
      this.logger.log(`[Google Auth] New user detected: ${email}. Creating account...`);
      
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

      const createResponse = await firstValueFrom(
        profileGrpc.createIndividualAccountWithProfiles(createAccountDto)
      );

      if (!createResponse.success || !createResponse.data) {
        this.logger.error(`[Google Auth] Profile creation failed: ${createResponse.message}`);
        throw new Error('Profile creation failed');
      }

      const accountData = createResponse.data;
      const userData = accountData.users?.[0];

      if (!userData) {
        throw new Error('No user found in created account');
      }

      userUuid = userData.uuid;
      accountUuid = accountData.uuid;
      accountStatus = 'ACTIVE';

      await this.prisma.credential.create({
        data: {
          userUuid,
          accountUuid,
          email,
          googleProviderId,
          mfaEnabled: true,
          passwordHash: null,
          accountStatus,
        },
      });

      await this.redisSession.cacheCredential(email, {
        userUuid,
        accountUuid,
        accountStatus,
        role: 'Individual',
        email,
      });

      const profileType = onboardingData?.primaryPurpose 
        ? this.mapPurposeToProfileType(onboardingData.primaryPurpose)
        : null;
      
      const profileDataForEmail = this.extractProfileDataForEmail(
        onboardingData?.primaryPurpose,
        onboardingData
      );

      // Notifications (fire and forget)
      Promise.all([
        this.queue.addJob('email-queue', 'welcome-email', {
          to: email,
          accountId: accountData.accountCode,
          firstName: firstName,
          lastName: lastName,
          plan: 'Free Forever',
          profileType: profileType,
          profileData: profileDataForEmail,
        }, { removeOnComplete: true }),
        this.queue.addJob('email-queue', 'admin-notification', {
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
            device: clientInfo?.device,
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
    }

    // 3. CHECK ACCOUNT STATUS
    if (accountStatus !== 'ACTIVE') {
      this.logger.warn(`[Google Auth] Blocked login for ${email}: account status is ${accountStatus}`);
      throw new UnauthorizedException(`Your account is ${accountStatus.toLowerCase()}.`);
    }

    // 4. GENERATE TOKENS WITH ROLE CACHING
    const tokenId = `${userUuid}-${Date.now()}`;
    const now = Math.floor(Date.now() / 1000);
    
    // Try to get role from cache first
    let roleType = await this.redisSession.getCachedUserRole(userUuid);
    
    if (!roleType) {
      // Cache miss - fetch from RBAC service
      this.logger.debug(`Role cache miss for ${userUuid}, fetching from RBAC service`);
      try {
        const rbacService = this.getRbacGrpcService();
        const userRoleResponse = await firstValueFrom(
          rbacService.getUserRole({ userUuid })
        );
        roleType = userRoleResponse?.role?.roleType ?? 'Individual';
        
        // Cache for next time (5 minutes TTL)
        await this.redisSession.cacheUserRole(userUuid, roleType);
      } catch (err) {
        this.logger.warn(`Failed to fetch role from RBAC, using default role: ${err.message}`);
        roleType = 'Individual';
      }
    } else {
      this.logger.debug(`Role cache HIT for ${userUuid}: ${roleType}`);
    }

    const jwtPayload: JwtPayload = {
      sub: userUuid,
      jti: tokenId,
      iat: now,
      email: email,
      accountId: accountUuid,
      role: roleType,
      accountType: 'INDIVIDUAL',
      organizationUuid: null,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(jwtPayload, { expiresIn: '15m' }),
      this.jwtService.signAsync(jwtPayload, { expiresIn: '7d' })
    ]);

    const hashedToken = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // 5. Store session in DB and Redis (parallel)
    await Promise.all([
      this.prisma.session.create({
        data: {
          userUuid: userUuid,
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
      }),
      this.prisma.credential.update({
        where: { userUuid: userUuid },
        data: { lastLoginAt: new Date() }
      }),
      this.redisSession.storeSession(tokenId, userUuid, hashedToken, clientInfo)
    ]);

    // 6. Send notification (fire and forget)
    if (!isNewUser) {
      this.sendLoginNotificationAsync(email, userUuid, clientInfo, firstName, lastName);
    }

    // 7. Cache user profile (fire and forget)
    const profileObservable = profileGrpc.getUserProfileByUuid({ userUuid });
    firstValueFrom(profileObservable)
      .then(profileResponse => {
        if (profileResponse?.success && profileResponse?.data) {
          this.redisSession.cacheUserProfile(userUuid, profileResponse.data)
            .catch(err => this.logger.debug(`Profile cache failed: ${err.message}`));
        }
      })
      .catch(err => this.logger.warn(`Failed to cache user profile: ${err.message}`));

    const elapsed = Date.now() - startTime;
    const successMessage = isNewUser ? 'Signup successful' : 'Login successful';
    this.logger.log(`✅ Google ${successMessage} completed in ${elapsed}ms for: ${email}`);

    return BaseResponseDto.ok(
      {
        id: userUuid,
        uuid: userUuid,
        userCode: '',
        accountId: accountUuid,
        email: email,
        firstName: firstName,
        lastName: lastName,
        phone: null,
        status: accountStatus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        accessToken,
        refreshToken,
      } as LoginResponseDto,
      successMessage,
      'OK'
    );

  } catch (err) {
    const errorMessage = err.details || err.message;
    this.logger.error(`[Google Auth] Failure: ${errorMessage}`);
    
    this.queue.addJob(
      'analytics-queue',
      'user-login-error',
      {
        error: errorMessage,
        method: 'GOOGLE',
        clientInfo: clientInfo ? {
          device: clientInfo.device,
          deviceType: clientInfo.deviceType,
          os: clientInfo.os,
          browser: clientInfo.browser,
          isBot: clientInfo.isBot
        } : null,
        timestamp: new Date().toISOString()
      },
      { removeOnComplete: true }
    ).catch(err => this.logger.error(`Failed to queue error analytics: ${err.message}`));

    throw new UnauthorizedException(`Google Auth failed: ${errorMessage}`);
  }
}

// Helper methods to add to your AuthService
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

  // ------------------ Logout ------------------
 async logout(userUuid: string, tokenId?: string): Promise<void> {
  const startTime = Date.now();
  this.logger.log(`🚪 Logout requested for user: ${userUuid}, tokenId: ${tokenId || 'ALL'}`);

  try {
    if (tokenId) {
      // 1. Blacklist token in Redis immediately (fast - prevents further use)
      await this.redisSession.blacklistToken(tokenId);
      
      // 2. Queue DB update (non-blocking)
      this.queue.addJob(
        'db-sync',
        'revoke-session',
        {
          tokenId,
          userUuid,
          timestamp: new Date().toISOString(),
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: true,
        }
      ).catch(err => this.logger.error(`Failed to queue session revocation: ${err.message}`));
      
      // 3. Remove from Redis session store (fast)
      await this.redisSession.removeSession(tokenId);
      
    } else {
      // Revoke ALL sessions for user
      
      // 1. Get all active session IDs for this user
      const userSessionsKey = `user_sessions:${userUuid}`;
      const sessionIds = await this.redisService.getKeys(`${userSessionsKey}:*`);
      
      // 2. Blacklist all tokens in Redis (fast)
      const blacklistPromises = sessionIds.map(sessionId => 
        this.redisSession.blacklistToken(sessionId.replace(`${userSessionsKey}:`, ''))
      );
      await Promise.all(blacklistPromises);
      
      // 3. Queue DB update (non-blocking)
      this.queue.addJob(
        'db-sync',
        'revoke-all-sessions',
        {
          userUuid,
          timestamp: new Date().toISOString(),
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: true,
        }
      ).catch(err => this.logger.error(`Failed to queue revoke all sessions: ${err.message}`));
      
      // 4. Remove user session index from Redis
      await this.redisService.deletePattern(`${userSessionsKey}:*`);
    }
    
    const elapsed = Date.now() - startTime;
    this.logger.log(`✅ Logout completed in ${elapsed}ms for user: ${userUuid}`);
    
  } catch (error) {
    this.logger.error(`Logout failed for user ${userUuid}: ${error.message}`);
    // Don't throw - logout should succeed even if cleanup fails partially
  }
}


  // ------------------ Dev Token Generation ------------------
async generateDevToken(
  userUuid: string, 
  email: string, 
  role: string, 
  accountId: string
): Promise<BaseResponseDto<TokenPairDto>> {
  const userGrpcService = this.getProfileGrpcService();
  
  try {
    // 1. Fetch user profile
    const profileResponse = await firstValueFrom(
      userGrpcService.getUserProfileByUuid({ userUuid: userUuid })
    );
    
    const { user: userData, account: accountData, organization: organizationData } = profileResponse.data;
    const organizationUuid = organizationData?.uuid || null;

    // 2. Generate Dev Token ID
    const devTokenId = `dev-${userUuid}-${Date.now()}`;
    const now = Math.floor(Date.now() / 1000);
 
    // 3. Prepare Payload with standard JWT claims
    const payload: JwtPayload = {
      // Standard claims
      sub: userUuid,
      jti: devTokenId,
      iat: now,

      
      // Custom claims
      email: email,
      accountId: accountId,
      role: role,
      accountType: accountData.type as 'INDIVIDUAL' | 'ORGANIZATION',
      organizationUuid: organizationUuid,
    };

    // 4. Parallel token signing
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: '1h' }),
      this.jwtService.signAsync(payload, { expiresIn: '7d' }),
    ]);

    // 5. Hash refresh token
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    // 6. Batch database operations
    await this.prisma.$transaction([
      this.prisma.session.deleteMany({
        where: {
          userUuid,
          device: 'Postman-Dev',
        },
      }),
      this.prisma.session.create({
        data: {
          userUuid,
          tokenId: devTokenId,
          hashedToken: hashedRefreshToken,
          device: 'Postman-Dev',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          revoked: false,
          lastActiveAt: new Date(),
        },
      }),
    ]);

    this.logger.log(`🔑 Dev token generated for ${email}`);

    return BaseResponseDto.ok(
      { accessToken, refreshToken },
      'Dev tokens generated successfully',
      'OK'
    );

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Dev token generation failed';
    this.logger.error(`Dev Token Error: ${errorMessage}`);
    return BaseResponseDto.fail(errorMessage, 'INTERNAL_ERROR');
  }
}


async requestOtp(
  dto: RequestOtpDto & { purpose: OtpPurpose } & { phone?: string }
): Promise<BaseResponseDto<null>> {
  const { email, purpose, phone } = dto;
  const startTime = Date.now();

  // Get purpose-specific configuration
  const config = getRateLimitConfig(purpose);
  const validation = config.validation;

  try {
    // 1. CHECK rate limit (Redis - fast)
    const rateLimitResult = await this.queue.checkRateLimit(
      email, 
      `otp_${purpose}`, 
      config.maxAttempts,
      config.windowSeconds
    );
    
    if (!rateLimitResult.allowed) {
      const minutesLeft = Math.ceil(rateLimitResult.resetInSeconds / 60);
      this.logger.warn(`[OTP] Rate limit exceeded for ${email} (${purpose})`);
      return BaseResponseDto.fail(
        config.errorMessage(minutesLeft, rateLimitResult.attempts),
        'TOO_MANY_REQUESTS'
      );
    }
    
    // 2. Check user existence (optimized - parallel where possible)
    let existingUser = null;
    let existingPhone = null;
    
    if (validation && validation.userExists !== 'ignore') {
      // Single query to check credential
      existingUser = await this.prisma.credential.findUnique({
        where: { email },
        select: { id: true, phone: true, userUuid: true },
      });
      
      // Also check profile service for existing user (for Google signups etc.)
      if (!existingUser && validation.userExists === 'forbidden') {
        try {
          const profileGrpc = this.getProfileGrpcService();
          const profileResponse = await firstValueFrom(
            profileGrpc.getUserProfileByEmail({ email })
          );
          if (profileResponse?.success && profileResponse.data) {
            existingUser = { id: 'profile-exists', phone: null, userUuid: profileResponse.data.user.uuid };
            this.logger.debug(`[OTP] User exists in Profile service for ${email}`);
          }
        } catch (profileErr) {
          this.logger.debug(`[OTP] Profile check failed for ${email}: ${profileErr.message}`);
        }
      }
    }

    // 3. Check phone uniqueness ONLY for EMAIL_VERIFICATION (signup) - parallel query
    if (purpose === 'EMAIL_VERIFICATION' && phone) {
      existingPhone = await this.prisma.credential.findUnique({
        where: { phone },
        select: { id: true },
      });
      
      if (existingPhone) {
        this.logger.warn(`[OTP] Signup blocked: Phone ${phone} already registered`);
        return BaseResponseDto.fail(
          'This phone number is already registered.',
          'CONFLICT',
          { code: 'PHONE_EXISTS' }
        );
      }
    }

    this.logger.debug(`[OTP] Validation config for ${purpose}:`, validation);
    
    // 4. Apply validation rules
    if (validation?.userExists === 'required' && !existingUser) {
      if (validation?.requireDelayOnError) {
        await this.simulateDelay();
      }
      return BaseResponseDto.fail(
        validation?.customMessage?.userNotFound || 'Account not found.',
        'NOT_FOUND'
      );
    }

    if (validation?.userExists === 'forbidden' && existingUser) {
      this.logger.warn(`[OTP] Signup blocked: Email ${email} already registered`);
      return BaseResponseDto.fail(
        validation?.customMessage?.userExists || 'This email is already registered. Please login instead.',
        'CONFLICT',
        { code: 'EMAIL_EXISTS', userExists: true }
      );
    }

    if (validation?.returnSuccessOnNonExistent && !existingUser) {
      this.logger.log(`[OTP] Request for non-existent email: ${email} (${purpose})`);
      return BaseResponseDto.ok(null, validation?.customMessage?.userNotFound || 'If an account exists, a code has been sent.');
    }

    // 5. Generate OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60000);

    // 6. Store OTP in BOTH Database AND Redis (parallel)
    const redisKey = `otp:${email}:${purpose}`;
    
    await Promise.all([
      // Store in Redis (fast, 2-5ms)
      this.redisService.setEx(redisKey, otpCode, 600), // 10 minutes TTL
      
      // Store in Database (for persistence)
      this.prisma.otp.upsert({
        where: {
          email_purpose: { email, purpose }
        },
        update: {
          code: otpCode,
          expiresAt: expiresAt,
          createdAt: now,
        },
        create: {
          email,
          code: otpCode,
          purpose,
          expiresAt,
          createdAt: now,
        },
      })
    ]);

    // Verify it was stored
    const verifyStored = await this.redisService.get(redisKey);
    this.logger.debug(`✅ Verified Redis storage: ${verifyStored === otpCode ? 'SUCCESS' : 'FAILED'}`);

    // 7. INCREMENT rate limit counter (Redis)
    await this.queue.incrementRateLimit(
      email, 
      `otp_${purpose}`, 
      config.maxAttempts,
      config.windowSeconds
    );

    // 8. Queue email (fire and forget - don't await if possible)
    this.queue.addJob(
      'email-queue',
      'send-otp',
      {
        to: email,
        code: otpCode,
        purpose: purpose,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      }
    ).catch(err => this.logger.error(`Failed to queue OTP email: ${err.message}`));

    // 9. Async cleanup (fire and forget - don't await)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    this.prisma.otpRequestLog.deleteMany({
      where: {
        email,
        purpose,
        createdAt: { lt: tenMinutesAgo }
      },
    }).catch(err => this.logger.debug(`Cleanup failed: ${err.message}`));

    // 10. Create log entry (async, don't await)
    this.prisma.otpRequestLog.create({
      data: { email, purpose, createdAt: now },
    }).catch(err => this.logger.debug(`Log failed: ${err.message}`));

    const totalTime = Date.now() - startTime;
    this.logger.log(`[OTP] Code sent to ${email} for ${purpose} in ${totalTime}ms`);

    return BaseResponseDto.ok(null, config.successMessage || 'Verification code sent to your email');

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Failed to generate OTP for ${email}: ${message}`);
    return BaseResponseDto.fail('An error occurred while processing your request', 'INTERNAL_ERROR');
  }
}

// Helper to prevent timing attacks
private async simulateDelay(): Promise<void> {
  const delay = Math.random() * 100 + 50; // 50-150ms random delay
  await new Promise(resolve => setTimeout(resolve, delay));
}




/** ------------------ Verify OTP ------------------ */
async verifyOtp(
  dto: VerifyOtpDto & { purpose: OtpPurpose }
): Promise<BaseResponseDto<{ verified: boolean }>> {
  const { email, code, purpose } = dto;
  const startTime = Date.now();

  try {
    // 1. Check Redis first
    const redisKey = `otp:${email}:${purpose}`;
    this.logger.debug(`🔍 Looking for OTP in Redis with key: ${redisKey}`);
    
    const cachedOtp = await this.redisService.get(redisKey);
    this.logger.debug(`📦 Redis returned: ${cachedOtp}, Expected: ${code}`);
    
    if (cachedOtp === code) {
      // Valid OTP found in Redis
      await this.redisService.delete(redisKey);
      this.logger.debug(`🗑️ Deleted OTP from Redis`);
      
      const totalTime = Date.now() - startTime;
      this.logger.log(`✅ OTP verified from Redis in ${totalTime}ms`);
      
      return BaseResponseDto.ok(
        { verified: true },
        'Verification successful',
        'OK'
      );
    }
    
    // 2. Fallback to database
    this.logger.debug(`Redis miss for ${email}, checking database...`);
    const deleteResult = await this.prisma.otp.deleteMany({
      where: {
        email,
        code,
        purpose,
        expiresAt: { gt: new Date() },
      },
    });

    if (deleteResult.count === 0) {
      this.logger.warn(`❌ No valid OTP found for ${email}`);
      return BaseResponseDto.fail(
        'Invalid or expired verification code.',
        'UNAUTHORIZED',
        { code: 'INVALID_OTP', verified: false }
      );
    }
    
    const totalTime = Date.now() - startTime;
    this.logger.log(`✅ OTP verified from DB in ${totalTime}ms`);
    
    return BaseResponseDto.ok(
      { verified: true },
      'Verification successful',
      'OK'
    );

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown validation error';
    this.logger.error(`Error verifying OTP for ${email}: ${errorMsg}`);
    
    return BaseResponseDto.fail(
      'An error occurred during verification. Please try again.',
      'INTERNAL_ERROR',
      { code: 'INTERNAL_ERROR', message: errorMsg }
    );
  }
}

async verifyMfaLogin(
  verifyDto: VerifyOtpDto,
  clientInfo?: AuthClientInfoDto
): Promise<BaseResponseDto<LoginResponseDto>> {
  const startTime = Date.now();
  this.logger.debug(`MFA verification for: ${verifyDto.email}`);

  try {
    // 1. Verify OTP (already fast - 1ms)
    const verificationResult = await this.verifyOtp({
      email: verifyDto.email,
      code: verifyDto.code,
      purpose: 'LOGIN_2FA',
    });

    if (!verificationResult.success || !verificationResult.data?.verified) {
      return BaseResponseDto.fail(
        verificationResult.message || 'Invalid or expired verification code',
        'UNAUTHORIZED',
        { code: 'INVALID_OTP', details: verificationResult.error }
      );
    }
    
    // 2. Get credential - Try cache FIRST, fallback to DB
    let credential = await this.redisSession.getCachedCredential(verifyDto.email);
    
    if (!credential) {
      // Cache miss - get from database
      this.logger.debug(`Credential cache miss for ${verifyDto.email}, fetching from DB`);
      const dbCredential = await this.prisma.credential.findUnique({
        where: { email: verifyDto.email },
        select: { 
          userUuid: true, 
          accountUuid: true, 
          accountStatus: true,
          memberStatus: true,
          role: true,
        },
      });
      
      if (!dbCredential) {
        return BaseResponseDto.fail('User not found', 'NOT_FOUND');
      }
      
      credential = dbCredential;
      
      // Cache for next time (5 minutes TTL)
      await this.redisSession.cacheCredential(verifyDto.email, credential);
    } else {
      this.logger.debug(`Credential cache HIT for ${verifyDto.email}`);
    }

    // 3. Check account status
    if (credential.accountStatus !== 'ACTIVE') {
      return BaseResponseDto.fail(
        `Account is ${credential.accountStatus.toLowerCase()}`,
        'ACCOUNT_INACTIVE'
      );
    }

    // 4. Get role from cache or RBAC service
    let roleType = await this.redisSession.getCachedUserRole(credential.userUuid);
    
    if (!roleType) {
      // Cache miss - fetch from RBAC service
      this.logger.debug(`Role cache miss for ${credential.userUuid}, fetching from RBAC`);
      try {
        const rbacService = this.getRbacGrpcService();
        const userRoleResponse = await firstValueFrom(
          rbacService.getUserRole({ userUuid: credential.userUuid })
        );
        roleType = userRoleResponse?.role?.roleType ?? credential.role ?? 'Individual';
        
        // Cache for next time (5 minutes TTL)
        await this.redisSession.cacheUserRole(credential.userUuid, roleType);
      } catch (err) {
        this.logger.warn(`Failed to fetch role from RBAC, using credential role: ${err.message}`);
        roleType = credential.role ?? 'Individual';
      }
    } else {
      this.logger.debug(`Role cache HIT for ${credential.userUuid}: ${roleType}`);
    }

    // 5. Generate tokens
    const tokenId = `${credential.userUuid}-${Date.now()}`;
    const now = Math.floor(Date.now() / 1000);
    
    const payload: JwtPayload = {
      sub: credential.userUuid,
      jti: tokenId,
      iat: now,
      email: verifyDto.email,
      accountId: credential.accountUuid,
      role: roleType,
      accountType: 'INDIVIDUAL',
      organizationUuid: null,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: '15m' }),
      this.jwtService.signAsync(payload, { expiresIn: '7d' })
    ]);

    const hashedToken = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // 6. Create DB session and update last login in parallel
    await Promise.all([
      this.prisma.session.create({
        data: {
          userUuid: credential.userUuid,
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
      }),
      
      this.prisma.credential.update({
        where: { userUuid: credential.userUuid },
        data: { lastLoginAt: new Date() }
      }),
    ]);

    // 7. Store session in Redis (fast)
    await this.redisSession.storeSession(
      tokenId,
      credential.userUuid,
      hashedToken,
      clientInfo
    );

    // 8. Fire and forget - Profile fetch, caching, and notification (don't await)
    const profileObservable = this.getProfileGrpcService().getUserProfileByUuid({ 
      userUuid: credential.userUuid 
    });
    
    firstValueFrom(profileObservable)
      .then(profileResponse => {
        if (profileResponse?.success && profileResponse?.data) {
          const firstName = profileResponse.data.user?.firstName || 'User';
          const lastName = profileResponse.data.user?.lastName || '';
          
          // Cache profile in Redis
          this.redisSession.cacheUserProfile(credential.userUuid, profileResponse.data)
            .catch(err => this.logger.debug(`Profile cache failed: ${err.message}`));
          
          // Send notification
          this.sendLoginNotificationAsync(
            verifyDto.email, 
            credential.userUuid, 
            clientInfo, 
            firstName, 
            lastName
          );
        } else {
          // Send notification without names
          this.sendLoginNotificationAsync(
            verifyDto.email, 
            credential.userUuid, 
            clientInfo, 
            'User', 
            ''
          );
        }
      })
      .catch(err => this.logger.warn(`Profile fetch failed: ${err.message}`));

    const totalTime = Date.now() - startTime;
    this.logger.log(`✅ MFA verification completed in ${totalTime}ms`);

    return BaseResponseDto.ok(
      { 
        accessToken, 
        refreshToken,
        message: 'Login successful'
      } as LoginResponseDto,
      'Login successful',
      'OK'
    );

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
    this.logger.error(`MFA verification failed:`, err);
    
    return BaseResponseDto.fail(errorMessage, 'INTERNAL_ERROR');
  }
}


private async sendLoginNotificationAsync(
  email: string, 
  userUuid: string, 
  clientInfo?: AuthClientInfoDto,
  firstName= 'User',
  lastName= ''
): Promise<void> {
  this.queue.addJob(
    'email-queue',
    'login-notification',
    {
      to: email,
      firstName: firstName,
      lastName: lastName,
      device: clientInfo?.device,
      deviceType: clientInfo?.deviceType,
      os: clientInfo?.os,
      osVersion: clientInfo?.osVersion,
      browser: clientInfo?.browser,
      browserVersion: clientInfo?.browserVersion,
      ipAddress: clientInfo?.ipAddress,
      timestamp: new Date().toISOString(),
    },
    {
      attempts: 2,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
    }
  ).catch(err => this.logger.error(`Failed to queue login notification: ${err.message}`));
}


/** ------------------ Forgot Password: Step 1 (Request) ------------------ */
async requestPasswordReset(dto: RequestOtpDto): Promise<BaseResponseDto<null>> {
  this.logger.log(`🔐 Password reset requested for: ${dto.email}`);
  
  // Rate limit by IP and email to prevent abuse
  const rateLimitKey = `password_reset:${dto.email}`;
  const rateLimitResult = await this.queue.checkRateLimit(
    rateLimitKey,
    'password_reset',
    3, // Max 3 attempts
    3600 // Per hour
  );
  
  if (!rateLimitResult.allowed) {
    this.logger.warn(`Password reset rate limit exceeded for: ${dto.email}`);
    // Still return success message to prevent enumeration
    return BaseResponseDto.ok(null, 'If an account exists, a reset code has been sent.');
  }
  
  // Try to get user from cache first (faster)
  let userExists = false;
  let userUuid: string | undefined;
  
  const cachedCredential = await this.redisSession.getCachedCredential(dto.email);
  
  if (cachedCredential) {
    userExists = true;
    userUuid = cachedCredential.userUuid;
    this.logger.debug(`Password reset - user found in cache: ${dto.email}`);
  } else {
    // Cache miss - check database
    const credential = await this.prisma.credential.findUnique({ 
      where: { email: dto.email },
      select: { userUuid: true }
    });
    userExists = !!credential;
    userUuid = credential?.userUuid;
    
    if (userExists) {
      this.logger.debug(`Password reset - user found in DB: ${dto.email}`);
    }
  }
  
  // Security: Always return same message
  if (!userExists) {
    this.logger.debug(`Password reset requested for non-existent email: ${dto.email}`);
    await this.simulateDelay(); // Prevent timing attacks
    await this.queue.incrementRateLimit(rateLimitKey, 'password_reset', 3, 3600);
    return BaseResponseDto.ok(null, 'If an account exists, a reset code has been sent.');
  }

  // Track reset requests for monitoring
  await this.redisService.increment(`reset_requests:${userUuid}`);
  
  // Generate and send OTP
  this.logger.log(`🔐 Calling requestOtp for PASSWORD_RESET to: ${dto.email}`);
  const result = await this.requestOtp({ email: dto.email, purpose: 'PASSWORD_RESET' });
  
  // Increment rate limit counter
  await this.queue.incrementRateLimit(rateLimitKey, 'password_reset', 3, 3600);
  
  this.logger.log(`🔐 requestOtp result: ${result.success ? 'SUCCESS' : 'FAILED'} - ${result.message}`);
  
  return result;
}

  /** ------------------ Forgot Password: Step 2 (Reset) ------------------ */
async resetPassword(dto: ResetPasswordDto): Promise<BaseResponseDto<null>> {
  const { email, code, newPassword } = dto;

  try {
    // 1. Verify OTP without deleting
    const otpVerification = await this.verifyOtp({ 
      email, 
      code, 
      purpose: 'PASSWORD_RESET' 
    });
 
    if (!otpVerification.success) {
      return BaseResponseDto.fail(otpVerification.message, otpVerification.code);
    }

    // 2. Perform the update and revocation in a transaction
    return await this.prisma.$transaction(async (tx) => {
      // Hash the new password
      const passwordHash = await bcrypt.hash(newPassword, 12);

      // Update the credential
      const updatedCredential = await tx.credential.update({
        where: { email },
        data: { 
          passwordHash,
          failedAttempts: 0,
          lockoutExpires: null 
        },
        select: { userUuid: true }
      });

      // 3. Reuse your existing revokeSessions logic
      await this.revokeSessions(updatedCredential.userUuid);

      // 4. DELETE OTP ONLY AFTER SUCCESSFUL PASSWORD RESET
      await tx.otp.deleteMany({ 
        where: { email, code, purpose: 'PASSWORD_RESET' } 
      });

      return BaseResponseDto.ok(null, 'Password updated and all active sessions revoked.');
    });
  } catch (error) {
    this.logger.error(`Critical error during password reset for ${email}:`, error);
    return BaseResponseDto.fail('Failed to complete password reset', 'INTERNAL');
  }
}

  /** ------------------ Revoke Session(s) ------------------ */
async revokeSessions(userUuid: string, tokenId?: string): Promise<BaseResponseDto<null>> {
  const startTime = Date.now();
  
  try {
    if (tokenId) {
      this.logger.log(`🚫 Revoking specific session: ${tokenId} for user: ${userUuid}`);
      
      // 1. Blacklist in Redis immediately
      await this.redisSession.blacklistToken(tokenId);
      
      // 2. Remove from Redis session store
      await this.redisSession.removeSession(tokenId);
      
      // 3. Queue DB update (non-blocking)
      await this.queue.addJob(
        'db-sync',
        'revoke-session',
        {
          tokenId,
          userUuid,
          timestamp: new Date().toISOString(),
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: true,
        }
      );
      
    } else {
      this.logger.warn(`🚨 Revoking ALL sessions for user: ${userUuid}`);
      
      // 1. Get all session IDs for this user
      const userSessionsKey = `user_sessions:${userUuid}`;
      const sessionIds = await this.redisService.getKeys(`${userSessionsKey}:*`);
      
      // 2. Blacklist all in Redis
      const blacklistPromises = sessionIds.map(sessionId => 
        this.redisSession.blacklistToken(sessionId.replace(`${userSessionsKey}:`, ''))
      );
      await Promise.all(blacklistPromises);
      
      // 3. Remove user session index
      await this.redisService.deletePattern(`${userSessionsKey}:*`);
      
      // 4. Queue DB update
      await this.queue.addJob(
        'db-sync',
        'revoke-all-sessions',
        {
          userUuid,
          timestamp: new Date().toISOString(),
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: true,
        }
      );
    }
    
    const elapsed = Date.now() - startTime;
    this.logger.log(`✅ Sessions revoked in ${elapsed}ms`);
    
    return BaseResponseDto.ok(null, 'Session(s) successfully revoked');
    
  } catch (err) {
    this.logger.error(`Failed to revoke sessions for ${userUuid}: ${err.message}`);
    return BaseResponseDto.fail('Failed to revoke session', 'INTERNAL_ERROR');
  }
}
 
async getActiveSessions(userUuid: string): Promise<BaseResponseDto<SessionDto[]>> {
  this.logger.log(`🔍 Fetching active sessions for user: ${userUuid}`);
 
  try {
    const sessions = await this.prisma.session.findMany({
      where: {
        userUuid: userUuid,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: {
        lastActiveAt: 'desc',
      },
    });

    // We map every field required by the SessionDto type definition
    const sessionDtos: SessionDto[] = sessions.map((s) => ({
      id: s.id, // Added: Database ID (likely Int based on your schema)
      tokenId: s.tokenId,
      device: s.device || 'Unknown Device',
      ipAddress: s.ipAddress || '0.0.0.0',
      userAgent: s.userAgent || 'Unknown Browser',
      os: s.os || 'Unknown OS',
      revoked: s.revoked, // Added: Status flag
      lastActiveAt: s.lastActiveAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      createdAt: s.createdAt.toISOString(), // Added: Creation timestamp
    }));

    return {
      success: true,
      message: sessions.length > 0 
        ? `Found ${sessions.length} active sessions.` 
        : 'No active sessions found.',
      code: 'OK',
      data: sessionDtos,
      error: null,
    } as BaseResponseDto<SessionDto[]>;
  } catch (error) {
    this.logger.error(`🔥 Failed to fetch sessions for ${userUuid}`, error.stack);
    return BaseResponseDto.fail(
      'An error occurred while retrieving active sessions.',
      'INTERNAL_ERROR',
    );
  }
}

/* ======================================================
   HANDLE INVITATION ACCEPTED (NEW USER)
   - Called when a new user accepts an invitation
   - Creates credentials and password setup token
====================================================== */
async handleInvitationAcceptedNewUser(data: {
  email: string;
  userUuid: string;
  accountUuid: string;  // ✅ Add this - organization account UUID
  organizationUuid: string;
  organizationName: string;
  roleName: string;
  firstName: string;
  lastName: string;
  phone: string;
}): Promise<void> {
  this.logger.log(`[INVITE] Creating credentials for new user: ${data.email}`);

  try {
    // 1. Check if credentials already exist
    const existingCredential = await this.prisma.credential.findUnique({
      where: { email: data.email }
    });

    if (existingCredential) {
      this.logger.warn(`[INVITE] Credentials already exist for ${data.email}`);
      
      // If credential exists but doesn't have member status for this org, update it
      if (!existingCredential.memberStatus) {
        await this.prisma.credential.update({
          where: { id: existingCredential.id },
          data: { 
            memberStatus: 'ACTIVE',
            accountUuid: data.accountUuid
          }
        });
        this.logger.log(`[INVITE] Updated existing credential with member status for ${data.email}`);
      }
      return;
    }

    // 2. Generate a password setup token (48 hour expiry)
    const setupToken = randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    // 3. Create credential record with organization context
    await this.prisma.credential.create({
      data: {
        userUuid: data.userUuid,
        accountUuid: data.accountUuid,      // ✅ Organization account UUID
        email: data.email,
        phone: data.phone || null,
        passwordHash: null,                  // No password yet (will be set via setup)
        mfaEnabled: true,
        failedAttempts: 0,
        lastLoginAt: null,
        accountStatus: 'ACTIVE',             // ✅ Organization account status
        memberStatus: 'ACTIVE',              // ✅ User's status within this organization
      },
    });

    // 4. Create password setup token
    await this.prisma.passwordSetupToken.create({
      data: {
        userUuid: data.userUuid,
        token: setupToken,
        expiresAt,
        used: false,
      },
    });

    // 5. Create audit record
    await this.prisma.invitationAudit.create({
      data: {
        email: data.email,
        userUuid: data.userUuid,
        organizationUuid: data.organizationUuid,
        invitedByUserUuid: 'system',
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      },
    });

    // 6. Emit event to send password setup email
    this.notificationBus.emit('user.password.setup.required', {
      email: data.email,
      userUuid: data.userUuid,
      firstName: data.firstName,
      lastName: data.lastName,
      setupToken,
      expiresAt: expiresAt.toISOString(),
      organizationName: data.organizationName,
      organizationUuid: data.organizationUuid,
    });

    this.logger.log(`[INVITE] Password setup token created for ${data.email} (Organization: ${data.organizationName})`);

  } catch (error) {
    this.logger.error(`[INVITE] Failed to create credentials for ${data.email}: ${error.message}`);
  }
}

/* ======================================================
   SETUP PASSWORD - For users who accepted invitation
====================================================== */
async setupPassword(dto: SetupPasswordRequestDto): Promise<BaseResponseDto<null>> {
  this.logger.log(`[INVITE] Setting up password for token: ${dto.token}`);

  try {
    // 1. Validate password confirmation
    if (dto.password !== dto.confirmPassword) {
      return BaseResponseDto.fail('Passwords do not match', 'BAD_REQUEST');
    }

    // 2. Find valid token
    const tokenRecord = await this.prisma.passwordSetupToken.findFirst({
      where: {
        token: dto.token,
        used: false,
        expiresAt: { gt: new Date() }
      },
      include: {
        credential: true
      }
    });

    if (!tokenRecord) {
      return BaseResponseDto.fail('Invalid or expired password setup token', 'NOT_FOUND');
    }

    // 3. Hash the new password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // 4. Update in transaction
    await this.prisma.$transaction(async (tx) => {
      // Update credential with password
      await tx.credential.update({
        where: { userUuid: tokenRecord.userUuid },
        data: { 
          passwordHash: hashedPassword,
          updatedAt: new Date()
        }
      });

      // Mark token as used
      await tx.passwordSetupToken.update({
        where: { id: tokenRecord.id },
        data: { used: true }
      });
    });

    // 5. Notify that password is set
    this.notificationBus.emit('user.password.setup.completed', {
      email: tokenRecord.credential.email,
      userUuid: tokenRecord.userUuid
    });

    this.logger.log(`[INVITE] Password setup completed for user: ${tokenRecord.credential.email}`);

    return BaseResponseDto.ok(null, 'Password set successfully. You can now login.', 'OK');

  } catch (error) {
    this.logger.error(`[INVITE] Password setup failed: ${error.message}`);
    return BaseResponseDto.fail('Failed to set password', 'INTERNAL_ERROR');
  }
}

/* ======================================================
   CHECK PASSWORD SETUP STATUS - For UI
====================================================== */
async checkPasswordSetupStatus(token: string): Promise<BaseResponseDto<{
  isValid: boolean;
  email?: string;
  expiresAt?: string;
}>> {
  this.logger.log(`[INVITE] Checking password setup token: ${token}`);

  try {
    const tokenRecord = await this.prisma.passwordSetupToken.findFirst({
      where: {
        token,
        used: false,
        expiresAt: { gt: new Date() }
      },
      include: {
        credential: {
          select: { email: true }
        }
      }
    });

    if (!tokenRecord) {
      return BaseResponseDto.ok(
        { isValid: false },
        'Token is invalid or expired',
        'OK'
      );
    }

    return BaseResponseDto.ok(
      {
        isValid: true,
        email: tokenRecord.credential.email,
        expiresAt: tokenRecord.expiresAt.toISOString()
      },
      'Token is valid',
      'OK'
    );

  } catch (error) {
    this.logger.error(`[INVITE] Status check failed: ${error.message}`);
    return BaseResponseDto.fail('Failed to check token status', 'INTERNAL_ERROR');
  }
}

/* ======================================================
   RESEND PASSWORD SETUP EMAIL
====================================================== */
async resendPasswordSetupEmail(email: string): Promise<BaseResponseDto<null>> {
  this.logger.log(`[INVITE] Resending password setup email to: ${email}`);

  try {
    // Find user with PENDING_PASSWORD status
    // You'll need to get this info from profile service or have a status in credentials
    const credential = await this.prisma.credential.findUnique({
      where: { email },
      include: {
        passwordSetupTokens: {
          where: { used: false, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!credential) {
      return BaseResponseDto.fail('User not found', 'NOT_FOUND');
    }

    // Check if there's an existing valid token
    let setupToken = credential.passwordSetupTokens[0]?.token;

    if (!setupToken) {
      // Create new token
      setupToken = randomUUID();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48);

      await this.prisma.passwordSetupToken.create({
        data: {
          userUuid: credential.userUuid,
          token: setupToken,
          expiresAt,
          used: false,
        }
      });
    }

    // Get user details from profile service (you'll need to add this gRPC call)
    const profileGrpc = this.getProfileGrpcService();
    const profileResponse = await firstValueFrom(
      profileGrpc.getUserProfileByUuid({ userUuid: credential.userUuid })
    );

    // Emit email event
    this.notificationBus.emit('user.password.setup.required', {
      email: credential.email,
      userUuid: credential.userUuid,
      firstName: profileResponse.data?.user?.firstName || 'User',
      setupToken,
      organizationName: 'Your Organization' // You might want to fetch this
    });

    return BaseResponseDto.ok(null, 'Password setup email sent', 'OK');

  } catch (error) {
    this.logger.error(`[INVITE] Resend failed: ${error.message}`);
    return BaseResponseDto.fail('Failed to resend email', 'INTERNAL_ERROR');
  }
}

async createInvitedUserCredentials(data: {
  email: string;
  userUuid: string;
  accountUuid: string;  // ✅ Required - organization account UUID
  firstName: string;
  lastName: string;
  phone: string;
  organizationName: string;
  organizationUuid: string;  // ✅ Required - organization UUID
  roleName: string;  // ✅ Required - role within organization
}): Promise<BaseResponseDto<null>> {
  this.logger.log(`[gRPC] Creating credentials for invited user: ${data.email} (Organization: ${data.organizationName})`);
  
  try {
    await this.handleInvitationAcceptedNewUser({
      email: data.email,
      userUuid: data.userUuid,
      accountUuid: data.accountUuid,      // ✅ Organization account UUID
      organizationUuid: data.organizationUuid,
      organizationName: data.organizationName,
      roleName: data.roleName,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
    });
    
    return BaseResponseDto.ok(null, 'Credentials created successfully', 'OK');
  } catch (error) {
    this.logger.error(`[gRPC] Failed to create credentials for invited user: ${error.message}`);
    return BaseResponseDto.fail(error.message, 'INTERNAL_ERROR');
  }
}

/**
 * Sync user role from Admin Service
 * Updates the role in the credential table
 */
async syncUserRole(
  userUuid: string,
  roleName: string,
  roleType: string,
  scope: string
): Promise<BaseResponseDto<SyncUserRoleResponseDto>> {
  this.logger.log(`🔄 [AUTH] Syncing role for user ${userUuid} to ${roleName} (${roleType}) with scope ${scope}`);

  try {
    // First, get the user's email before updating (needed for cache invalidation)
    const user = await this.prisma.credential.findUnique({
      where: { userUuid: userUuid },
      select: { email: true }
    });

    if (!user) {
      return BaseResponseDto.fail(
        `User with UUID ${userUuid} not found in Auth Service`,
        'NOT_FOUND'
      );
    }

    // Update the credential's role field
    const updatedCredential = await this.prisma.credential.update({
      where: { userUuid: userUuid },
      data: {
        role: roleType,  // Store the roleType (e.g., "PlatformSystemAdmin", "Individual")
        updatedAt: new Date(),
      },
    });

    // ✅ Invalidate credential cache since role changed
    await this.redisSession.invalidateCredentialCache(user.email);
    this.logger.debug(`Credential cache invalidated for ${user.email} due to role change`);

    this.logger.log(`✅ [AUTH] Successfully updated role for user ${userUuid} to ${roleType}`);

    // Also log if there's any member status that might need update for organization users
    if (updatedCredential.memberStatus && scope === 'SYSTEM') {
      this.logger.log(`[AUTH] User ${userUuid} has memberStatus: ${updatedCredential.memberStatus} and is now SYSTEM role`);
    }

    return BaseResponseDto.ok(
      { success: true, message: 'Role synced successfully' },
      'Role synced successfully',
      'OK'
    );

  } catch (error) {
    this.logger.error(`[AUTH] Failed to sync role for user ${userUuid}: ${error.message}`);
    
    // Check if user exists (Prisma error code for record not found)
    if (error.code === 'P2025') {
      return BaseResponseDto.fail(
        `User with UUID ${userUuid} not found in Auth Service`,
        'NOT_FOUND'
      );
    }
    
    return BaseResponseDto.fail(
      error.message || 'Unknown error syncing role',
      'INTERNAL_ERROR'
    );
  }
}
}


