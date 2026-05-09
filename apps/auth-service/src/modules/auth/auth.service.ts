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
} from '@pivota-api/dtos';
import { firstValueFrom, lastValueFrom, Observable } from 'rxjs';
import { BaseGetUserRoleReponseGrpc, JwtPayload } from '@pivota-api/interfaces';
import { randomUUID } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import * as dotenv from 'dotenv';
import { HttpService } from '@nestjs/axios';
import { getRateLimitConfig, OtpPurpose, QueueService, RedisService } from '@pivota-api/shared-redis';



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
    // 1. FETCH CREDENTIAL with all needed fields
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
      }
    });

    if (!credential) {
      this.logger.warn(`[AUTH] Login attempt failed: ${email} not found.`);
      return null;
    }

    this.logger.debug(`[AUTH] Found Credential for: ${email}. UserUUID: ${credential.userUuid}, AccountUUID: ${credential.accountUuid}`);

    // 2. CHECK LOCKOUT STATUS
    if (credential.lockoutExpires && credential.lockoutExpires > new Date()) {
      const remainingTime = Math.ceil((credential.lockoutExpires.getTime() - Date.now()) / 60000);
      this.logger.warn(`[AUTH] Blocked: ${email} locked for ${remainingTime} mins.`);
      throw new UnauthorizedException(`Account locked. Try again in ${remainingTime} minutes.`);
    }

    // 3. VERIFY PASSWORD
    const isValid = await bcrypt.compare(password, credential.passwordHash);
    if (!isValid) {
      const newFailedAttempts = credential.failedAttempts + 1;
      let lockoutExpires: Date | null = null;

      if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
        lockoutExpires = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60000);
        this.logger.error(`[AUTH] Locking account: ${email} due to max failed attempts.`);
      }

      await this.prisma.credential.update({
        where: { id: credential.id },
        data: { 
          failedAttempts: newFailedAttempts, 
          lockoutExpires 
        },
      });
      return null;
    }

    // 4. CHECK STATUS based on login context
    let effectiveStatus: string;
    let isOrganizationMember = false;

    if (organizationUuid) {
      // Organization login - check member status for this specific org
      if (!credential.memberStatus) {
        this.logger.warn(`[AUTH] User ${email} is not a member of any organization`);
        throw new UnauthorizedException('You are not a member of any organization.');
      }
      
      // For organization login, we need to verify the specific organization
      // The credential.memberStatus should reflect the status for the primary org
      // For multi-org support, you might need to query the specific org status
      effectiveStatus = credential.memberStatus;
      isOrganizationMember = true;
      
      this.logger.debug(`[AUTH] Organization login for ${email}, member status: ${effectiveStatus}`);
    } else {
      // Individual login - check account status
      effectiveStatus = credential.accountStatus;
      this.logger.debug(`[AUTH] Individual login for ${email}, account status: ${effectiveStatus}`);
    }

    // 5. CHECK IF STATUS ALLOWS LOGIN
    if (effectiveStatus !== 'ACTIVE') {
      const statusMessage = effectiveStatus.toLowerCase();
      this.logger.warn(`[AUTH] Blocked: ${email} account is ${statusMessage}`);
      
      if (effectiveStatus === 'PENDING_PAYMENT') {
        throw new UnauthorizedException('Please complete payment to activate your account.');
      }
      throw new UnauthorizedException(`Your account is ${statusMessage}.`);
    }

    // 6. RESET SECURITY FIELDS ON SUCCESS
    await this.prisma.credential.update({
      where: { id: credential.id },
      data: { 
        lastLoginAt: new Date(),
        failedAttempts: 0,
        lockoutExpires: null 
      }
    });

    this.logger.log(`[AUTH] User validated successfully: ${email} (${organizationUuid ? 'Organization' : 'Individual'} login)`);
    
    // Return minimal data needed for token generation
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
  
  // Store OTP in database
  await this.prisma.otp.upsert({
    where: {
      email_purpose: { email, purpose }
    },
    update: { code: otpCode, expiresAt, createdAt: new Date() },
    create: { email, code: otpCode, purpose, expiresAt, createdAt: new Date() },
  });
  
  // Queue email sending (fire and forget)
  await this.queue.addJob(
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
  );
  
  this.logger.debug(`OTP ${otpCode} queued for ${email}`);
}


  // ------------------ Refresh Token ------------------
async refreshToken(refreshToken: string): Promise<BaseResponseDto<TokenPairDto>> {
  if (!refreshToken) throw new UnauthorizedException('Refresh token is required');

  try {
    // 1. Verify the JWT integrity and expiration
    const payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken);
    
    // 2. Database Lookup: Find all active sessions for this user
    const sessions = await this.prisma.session.findMany({
      where: { 
        userUuid: payload.sub, 
        revoked: false,
        expiresAt: { gt: new Date() }
      },
    });

    // 3. Verify the hashed token matches the one in our database
    const validSession = sessions.find((s) => bcrypt.compareSync(refreshToken, s.hashedToken));
    
    if (!validSession) {
      this.logger.warn(`[AUTH] Refresh attempt with invalid/revoked token for user: ${payload.sub}`);
      throw new UnauthorizedException('Invalid or revoked refresh token');
    }

    // 4. Update the "Last Active" timestamp for the current session
    await this.prisma.session.update({
      where: { id: validSession.id },
      data: { lastActiveAt: new Date() }
    });

    // 5. Fetch fresh user profile details via gRPC
    const userGrpcService = this.getProfileGrpcService();
    const profileResponse = await firstValueFrom(
      userGrpcService.getUserProfileByUuid({ userUuid: payload.sub })
    );

    if (!profileResponse?.success || !profileResponse.data) {
      throw new UnauthorizedException('User profile no longer exists');
    }

    // 6. Issue a New Token Pair
    const tokens = await this.generateTokens(
      profileResponse.data,
      {
        device: validSession.device,
        ipAddress: validSession.ipAddress,
        userAgent: validSession.userAgent,
        os: validSession.os
      }
    );

    // 7. Revoke the old session used for this refresh (Token Rotation)
    await this.prisma.session.update({
      where: { id: validSession.id },
      data: { revoked: true }
    });

    // ✅ FIXED: Return using BaseResponseDto.ok() method for consistency
    return BaseResponseDto.ok(
      tokens,
      'Tokens refreshed successfully',
      'OK'
    );

  } catch (err: unknown) {
    this.logger.error(`[AUTH] Refresh Token Error: ${err instanceof Error ? err.message : 'Unknown'}`);
    
    if (err instanceof UnauthorizedException) {
      return BaseResponseDto.fail(
        err.message,
        'UNAUTHORIZED',
        { code: 'AUTH_FAILURE', message: err.message }
      );
    }

    return BaseResponseDto.fail(
      'Token refresh failed due to a system error',
      'INTERNAL_ERROR',
      { code: 'INTERNAL', message: err instanceof Error ? err.message : 'Refresh failed' }
    );
  }
}

async signInWithGoogle(
  clientInfo?: AuthClientInfoDto,
  googleLoginRequest?: GoogleLoginRequestDto
): Promise<BaseResponseDto<LoginResponseDto>> {
  try {
    const profileGrpc = this.getProfileGrpcService();
    
    const token = googleLoginRequest?.token;
    const onboardingData = googleLoginRequest?.onboardingData;
    
    if (!token) {
      throw new UnauthorizedException('Google token is required');
    }
    
    // 1. VERIFY GOOGLE TOKEN
    this.logger.log('🔍 [Google Auth] Verifying Google token...');
    const ticket = await this.googleClient.verifyIdToken({
      idToken: token,
      audience: [
        process.env.GOOGLE_CLIENT_ID,
        '407408718192.apps.googleusercontent.com',
        '759373816085-4o3n6e05g7ck3k6nb3f016c4civles7h.apps.googleusercontent.com'
      ]
    });
    
    const payload = ticket.getPayload();
    
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

    // 2. CHECK IF CREDENTIAL EXISTS
    const existingCredential = await this.prisma.credential.findFirst({
      where: {
        OR: [{ googleProviderId }, { email }]
      }
    });

    if (existingCredential) {
      // PATH A: EXISTING USER - Login flow
      this.logger.log(`🔍 [Google Auth] Existing user found: ${existingCredential.userUuid}`);
      
      userUuid = existingCredential.userUuid;
      accountUuid = existingCredential.accountUuid;
      accountStatus = existingCredential.accountStatus;
      
      // Link Google ID if not already linked
      if (!existingCredential.googleProviderId) {
        await this.prisma.credential.update({
          where: { id: existingCredential.id },
          data: { googleProviderId }
        });
        this.logger.log(`[Google Auth] Linked Google ID to existing account: ${email}`);
      }
      
      //  NEW: Get current user profile to check if picture needs update
      const userProfile = await firstValueFrom(
        profileGrpc.getUserProfileByUuid({ userUuid })
      );
      
      const currentProfileImage = userProfile?.data?.profile?.profileImage || 
                                   userProfile?.data?.profile?.profileImage;
      
      const hasGooglePicture = profileImage && 
                               profileImage.startsWith('https://lh3.googleusercontent.com/');
      
      // Check if Google has a picture AND it's different from current
      if (hasGooglePicture && currentProfileImage !== profileImage) {
        this.logger.log(`📸 Google profile picture changed for ${email}`);
        this.logger.log(`   Old: ${currentProfileImage}`);
        this.logger.log(`   New: ${profileImage}`);
        
        await firstValueFrom(
          profileGrpc.updateProfilePicture({
            accountUuid: accountUuid, 
            pictureUrl: profileImage,
            oldImageUrl: currentProfileImage,
          })
        );
      }
      
      // Track existing user login
      this.kafkaClient.emit('user.login.google', {
        userUuid,
        email,
        isNewUser: false,
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
      });

    } else {
      // PATH B: BRAND NEW USER - Create everything (existing logic - unchanged)
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

      // Send welcome emails (keep existing logic)
      const profileType = onboardingData?.primaryPurpose 
        ? this.mapPurposeToProfileType(onboardingData.primaryPurpose)
        : null;
      
      const profileDataForEmail = this.extractProfileDataForEmail(
        onboardingData?.primaryPurpose,
        onboardingData
      );

      this.notificationBus.emit('user.onboarded', {
        accountId: accountData.accountCode,
        firstName: firstName,
        email: email,
        plan: 'Free Forever',
        profileType: profileType,
        profileData: profileDataForEmail,
      });

      this.notificationBus.emit('admin.new.registration', {
        adminEmail: process.env.ADMIN_NOTIFICATION_EMAIL || 'onboarding@pivotaconnect.com',
        userEmail: email,
        userName: `${firstName} ${lastName}`.trim(),
        accountType: 'INDIVIDUAL',
        registrationMethod: 'GOOGLE',
        registrationDate: new Date().toISOString(),
        plan: 'Free Forever',
        primaryPurpose: onboardingData?.primaryPurpose || 'JUST_EXPLORING',
        profileType: profileType,
      });

      this.kafkaClient.emit('user.registered', {
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
      });
    }

    // 3. CHECK ACCOUNT STATUS
    if (accountStatus !== 'ACTIVE') {
      this.logger.warn(`[Google Auth] Blocked login for ${email}: account status is ${accountStatus}`);
      throw new UnauthorizedException(`Your account is ${accountStatus.toLowerCase()}.`);
    }

    // 4. GENERATE TOKENS (existing logic - unchanged)
    const tokenId = `${userUuid}-${Date.now()}`;
    const now = Math.floor(Date.now() / 1000);
    
    const rbacService = this.getRbacGrpcService();
    const userRoleResponse = await firstValueFrom(
      rbacService.getUserRole({ userUuid })
    );
    const roleType = userRoleResponse?.role?.roleType ?? 'Individual';

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

    const accessToken = await this.jwtService.signAsync(jwtPayload, { expiresIn: '15m' });
    const refreshToken = await this.jwtService.signAsync(jwtPayload, { expiresIn: '7d' });

    const hashedToken = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.session.create({
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
    });

    // 5. UPDATE LAST LOGIN
    await this.prisma.credential.update({
      where: { userUuid: userUuid },
      data: { lastLoginAt: new Date() }
    });

    // 6. SEND LOGIN NOTIFICATION (for existing users only)
    if (!isNewUser) {
      const loginEmailPayload = {
        to: email,
        firstName: firstName,
        lastName: lastName,
        subject: 'New Login to Your Pivota Account (via Google)',
        device: clientInfo?.device || 'Unknown Device',
        deviceType: clientInfo?.deviceType,
        os: clientInfo?.os || 'Unknown OS',
        osVersion: clientInfo?.osVersion,
        browser: clientInfo?.browser,
        browserVersion: clientInfo?.browserVersion,
        userAgent: clientInfo?.userAgent || 'Unknown Browser',
        ipAddress: clientInfo?.ipAddress || '0.0.0.0',
        timestamp: new Date().toISOString(),
        isBot: clientInfo?.isBot,
      };
      this.notificationBus.emit('user.login.email', loginEmailPayload);
    }

    const successMessage = isNewUser ? 'Signup successful' : 'Login successful';

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
    
    this.kafkaClient.emit('user.login.error', {
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
    });

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
    if (tokenId) {
      await this.prisma.session.updateMany({
        where: { tokenId },
        data: { revoked: true },
      });
    } else {
      await this.prisma.session.updateMany({
        where: { userUuid },
        data: { revoked: true },
      });
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
    // 1. CHECK rate limit
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
    
    // 2. Check user existence (only if validation rules require it)
    let existingUser = null;
    if (validation && validation.userExists !== 'ignore') {
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

    // 3. Check phone uniqueness ONLY for EMAIL_VERIFICATION (signup)
    if (purpose === 'EMAIL_VERIFICATION' && phone) {
      const existingPhone = await this.prisma.credential.findUnique({
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
    
    // 4. Apply validation rules (with null checks)
    if (validation?.userExists === 'required' && !existingUser) {
      if (validation?.requireDelayOnError) {
        await this.simulateDelay();
      }
      return BaseResponseDto.fail(
        validation?.customMessage?.userNotFound || 'Account not found.',
        'NOT_FOUND'
      );
    }

    // ✅ FIX: Return error immediately for existing user during signup
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

    // 5. Generate OTP (only reaches here if validation passes)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60000);

    // 6. UPSERT - Store phone only for EMAIL_VERIFICATION
    await this.prisma.otp.upsert({
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
    });

    // 7. INCREMENT rate limit counter AFTER successfully generating OTP
    await this.queue.incrementRateLimit(
      email, 
      `otp_${purpose}`, 
      config.maxAttempts,
      config.windowSeconds
    );

    // 8. Log request
    this.prisma.otpRequestLog.create({
      data: { email, purpose, createdAt: now },
    }).catch(err => this.logger.debug(`Log failed: ${err.message}`));


    this.logger.debug(`Sending OTP ${otpCode} to ${email} for ${purpose}`);
    // 9. Queue email (fire and forget)
    await this.queue.addJob(
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
    );

    // 10. Clean up old logs
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    this.prisma.otpRequestLog.deleteMany({
      where: {
        email,
        purpose,
        createdAt: { lt: tenMinutesAgo }
      },
    }).catch(err => this.logger.debug(`Cleanup failed: ${err.message}`));

    const totalTime = Date.now() - startTime;
    this.logger.log(`[OTP] Code sent to ${email} for ${purpose} in ${totalTime}ms`);

    // Use success message from config
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
    // 1. Check rate limit for OTP verification attempts (prevent brute force)
    const verifyLimit = getRateLimitConfig('OTP_VERIFICATION');
    
    const rateLimitResult = await this.queue.checkRateLimit(
      email,
      `verify_otp_${purpose}`,
      verifyLimit.maxAttempts,
      verifyLimit.windowSeconds
    );
    
    if (!rateLimitResult.allowed) {
      const minutesLeft = Math.ceil(rateLimitResult.resetInSeconds / 60);
      this.logger.warn(`[AUTH] OTP verification rate limit exceeded for ${email} (${purpose})`);
      return BaseResponseDto.fail(
        verifyLimit.errorMessage(minutesLeft),
        'TOO_MANY_REQUESTS'
      );
    }
    
    // 2. Single database call - find AND delete in one operation
    const deleteResult = await this.prisma.otp.deleteMany({
      where: {
        email,
        code,
        purpose,
        expiresAt: { gt: new Date() },
      },
    });

    if (deleteResult.count === 0) {
      // Increment failed attempt counter
      await this.queue.incrementRateLimit(
        email,
        `verify_otp_${purpose}`,
        verifyLimit.maxAttempts,
        verifyLimit.windowSeconds
      );
      
      this.logger.warn(`[AUTH] Failed OTP verification for: ${email} | Purpose: ${purpose}`);
      return BaseResponseDto.fail(
        'Invalid or expired verification code.',
        'UNAUTHORIZED',
        { code: 'INVALID_OTP', verified: false }
      );
    }
    
    // 3. Reset rate limit on success
    await this.queue.resetRateLimit(email, `verify_otp_${purpose}`);
    
    const totalTime = Date.now() - startTime;
    this.logger.log(`[AUTH] OTP verified successfully: ${email} [${purpose}] in ${totalTime}ms`);
    
    return BaseResponseDto.ok(
      { verified: true },
      'Verification successful',
      'OK'
    );

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown validation error';
    this.logger.error(`Error verifying OTP for ${email}: ${errorMsg}`);
    
    return BaseResponseDto.fail(
      'An error occurred during verification',
      'INTERNAL_ERROR',
      { code: 'VERIFICATION_ERROR', message: errorMsg }
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
    // 1. Rate limit check
    let stepStart = Date.now();
    const mfaLimit = getRateLimitConfig('MFA_VERIFICATION');
    const rateLimitResult = await this.queue.checkRateLimit(
      verifyDto.email,
      'mfa_verification',
      mfaLimit.maxAttempts,
      mfaLimit.windowSeconds
    );
    this.logger.log(`⏱️ Step 1 (rate limit): ${Date.now() - stepStart}ms`);
    
    if (!rateLimitResult.allowed) {
      const minutesLeft = Math.ceil(rateLimitResult.resetInSeconds / 60);
      return BaseResponseDto.fail(
        mfaLimit.errorMessage(minutesLeft),
        'TOO_MANY_REQUESTS'
      );
    }
    
    // 2. Verify OTP
    stepStart = Date.now();
    const verificationResult = await this.verifyOtp({
      email: verifyDto.email,
      code: verifyDto.code,
      purpose: 'LOGIN_2FA',
    });
    this.logger.log(`⏱️ Step 2 (verify OTP): ${Date.now() - stepStart}ms`);

    if (!verificationResult.success || !verificationResult.data?.verified) {
      await this.queue.incrementRateLimit(
        verifyDto.email,
        'mfa_verification',
        mfaLimit.maxAttempts,
        mfaLimit.windowSeconds
      );
      return BaseResponseDto.fail(
        'Invalid or expired verification code',
        'UNAUTHORIZED',
        { code: 'INVALID_OTP' }
      );
    }
    
    // 3. Reset rate limit
    stepStart = Date.now();
    await this.queue.resetRateLimit(verifyDto.email, 'mfa_verification');
    this.logger.log(`⏱️ Step 3 (reset rate limit): ${Date.now() - stepStart}ms`);
    
    // 4. Get credential with role (✅ NO gRPC call needed!)
    stepStart = Date.now();
    const credential = await this.prisma.credential.findUnique({
      where: { email: verifyDto.email },
      select: { 
        userUuid: true, 
        accountUuid: true, 
        accountStatus: true,
        memberStatus: true,
        role: true,  // ✅ Get role directly from credential
      },
    });
    this.logger.log(`⏱️ Step 4 (get credential): ${Date.now() - stepStart}ms`);

    if (!credential) {
      return BaseResponseDto.fail('User not found', 'NOT_FOUND');
    }

    // 5. Check account status
    if (credential.accountStatus !== 'ACTIVE') {
      return BaseResponseDto.fail(
        `Account is ${credential.accountStatus.toLowerCase()}`,
        'ACCOUNT_INACTIVE'
      );
    }

    // 6. Role is already in credential - no gRPC call needed!
    const roleType = credential.role;  // ✅ Instant, no network call
    this.logger.log(`⏱️ Step 6 (role from credential): 0ms`);

    // 7. Generate tokens
    stepStart = Date.now();
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
    this.logger.log(`⏱️ Step 7 (sign tokens): ${Date.now() - stepStart}ms`);

    // 8. Create session
    stepStart = Date.now();
    const hashedToken = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.session.create({
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
    });
    this.logger.log(`⏱️ Step 8 (create session): ${Date.now() - stepStart}ms`);

    // 9. Update last login
    stepStart = Date.now();
    await this.prisma.credential.update({
      where: { userUuid: credential.userUuid },
      data: { lastLoginAt: new Date() }
    });
    this.logger.log(`⏱️ Step 9 (update last login): ${Date.now() - stepStart}ms`);

    // 10. Send notification (async - don't await)
    this.sendLoginNotificationAsync(verifyDto.email, credential.userUuid, clientInfo);

    const totalTime = Date.now() - startTime;
    this.logger.log(`✅ MFA verification completed in ${totalTime}ms for: ${verifyDto.email}`);

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
    this.logger.error(`MFA verification failed for ${verifyDto.email}:`, err);
    return BaseResponseDto.fail(
      'An unexpected error occurred',
      'INTERNAL_ERROR'
    );
  }
}


private async sendLoginNotificationAsync(email: string, userUuid: string, clientInfo?: AuthClientInfoDto): Promise<void> {
  this.queue.addJob(
    'email-queue',
    'login-notification',
    {
      to: email,
      userUuid: userUuid,
      clientInfo: clientInfo,
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

// Helper method for fire-and-forget notifications
private sendLoginNotification(userData: any, profile: any, clientInfo?: AuthClientInfoDto): void {
  const adminRoles = ['Business System Admin'];
  const isOrgAccount = profile.account.type === 'ORGANIZATION';
  const isUserAdmin = isOrgAccount && adminRoles.includes(userData.roleName);

  const loginEmailPayload = {
    to: userData.email,
    firstName: userData.firstName,
    lastName: userData.lastName,
    organizationName: isOrgAccount ? profile.organization?.name : undefined,
    orgEmail: isUserAdmin ? profile.organization?.officialEmail : undefined,
    subject: isUserAdmin ? `SECURITY: Admin Login` : 'New Login detected',
    device: clientInfo?.device || 'Unknown',
    deviceType: clientInfo?.deviceType,
    os: clientInfo?.os || 'Unknown',
    osVersion: clientInfo?.osVersion,
    browser: clientInfo?.browser,
    browserVersion: clientInfo?.browserVersion,
    userAgent: clientInfo?.userAgent || 'Unknown',
    ipAddress: clientInfo?.ipAddress || '0.0.0.0',
    timestamp: new Date().toISOString(),
    isBot: clientInfo?.isBot,
  };

  this.notificationBus.emit('user.login.email', loginEmailPayload);
}

/** ------------------ Forgot Password: Step 1 (Request) ------------------ */
async requestPasswordReset(dto: RequestOtpDto): Promise<BaseResponseDto<null>> {
  this.logger.log(`🔐 Password reset requested for: ${dto.email}`);
  
  // Verify user exists before sending email
  const credential = await this.prisma.credential.findUnique({ where: { email: dto.email } });
  this.logger.log(`🔐 User exists: ${!!credential}`);
  
  if (!credential) {
    // Security best practice: don't reveal if email exists, just say "If account exists..."
    return BaseResponseDto.ok(null, 'If an account exists, a reset code has been sent.');
  }

  this.logger.log(`🔐 Calling requestOtp for PASSWORD_RESET to: ${dto.email}`);
  const result = await this.requestOtp({ email: dto.email, purpose: 'PASSWORD_RESET' });
  this.logger.log(`🔐 requestOtp result: ${result.success ? 'SUCCESS' : 'FAILED'} - ${result.message}`);
  
  return result;
}q

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
  try {
    let result: { count: any; };

    if (tokenId) {
      this.logger.log(`🚫 Revoking specific session: ${tokenId} for user: ${userUuid}`);
      result = await this.prisma.session.updateMany({
        where: { userUuid: userUuid, tokenId: tokenId, revoked: false },
        data: { revoked: true },
      });

      // If a specific tokenId was provided but nothing was updated
      if (result.count === 0) {
        this.logger.warn(`⚠️ No active session found for tokenId: ${tokenId}`);
        return BaseResponseDto.fail('Session not found or already revoked', 'NOT_FOUND');
      }
    } else {
      this.logger.warn(`🚨 Revoking ALL sessions for user: ${userUuid}`);
      result = await this.prisma.session.updateMany({
        where: { userUuid: userUuid, revoked: false },
        data: { revoked: true },
      });
      
      // Note: For Global Logout, you might still want to return 'ok' 
      // even if count is 0, as the end state (no active sessions) is achieved.
    }


    return BaseResponseDto.ok(null, 'Session(s) successfully revoked');
  } catch (err) {
    this.logger.error(`Failed to revoke sessions for ${userUuid}`, err);
    return BaseResponseDto.fail('Failed to revoke session', 'INTERNAL');
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
}


