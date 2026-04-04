/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Injectable,
  Logger,
  UnauthorizedException,
  OnModuleInit,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ClientGrpc, ClientProxy, RpcException } from '@nestjs/microservices';
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
  SendOtpEventDto,
  ResetPasswordDto,
  SetupPasswordRequestDto,
  AuthClientInfoDto,
  CreateAccountWithProfilesRequestDto,
  AccountResponseDto,
  SignupResponseDto,
} from '@pivota-api/dtos';
import { firstValueFrom, lastValueFrom, Observable } from 'rxjs';
import { BaseGetUserRoleReponseGrpc, JwtPayload } from '@pivota-api/interfaces';
import { randomUUID } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import * as dotenv from 'dotenv';
import { HttpService } from '@nestjs/axios';
import { QueueService } from '@pivota-api/shared-redis';



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
async validateUser(email: string, password: string): Promise<UserProfileResponseDto | null> {
  const MAX_FAILED_ATTEMPTS = 5;
  const LOCKOUT_DURATION_MINUTES = 15;

  try {
    // 1. FETCH CREDENTIAL (Identity Check)
    const credential = await this.prisma.credential.findUnique({
      where: { email },
    });

    if (!credential) {
      this.logger.warn(`[AUTH] Login attempt failed: ${email} not found.`);
      return null;
    }

    this.logger.debug(`[AUTH] Found Credential for: ${email}. UUID: ${credential.userUuid}`);

    // 2. CHECK LOCKOUT STATUS (Identity Level Protection)
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

    // 4. FETCH PROFILE (Cross-Service gRPC Call)
    const profileGrpcService = this.getProfileGrpcService();
    this.logger.debug(`[gRPC OUTBOUND] Calling ProfileService for UUID: ${credential.userUuid}`);

    const profileResponse = await firstValueFrom(
      profileGrpcService.getUserProfileByUuid({ userUuid: credential.userUuid })
    );

    // Verify gRPC response integrity
    if (!profileResponse?.success || !profileResponse.data) {
      this.logger.error(`[SYNC ERROR] Profile data missing in Profile Service for UUID: ${credential.userUuid}`);
      return null;
    }

    const fullProfileDto = profileResponse.data;

    // 5. CHECK USER STATUS (Business Logic)
    if (fullProfileDto.user.status !== 'ACTIVE') {
      const statusMessage = fullProfileDto.user.status ? fullProfileDto.user.status.toLowerCase() : 'inactive';
      this.logger.warn(`[AUTH] Blocked: User ${email} is currently ${statusMessage}`);
      throw new UnauthorizedException(`Your account is ${statusMessage}.`);
    }

    // 6. FINAL SUCCESS: RESET SECURITY & UPDATE GLOBAL ANCHOR
    // We update 'lastLoginAt' here in Credentials, but detailed activity 
    // tracking (IP/Device) happens in the 'generateTokens' session creation.
    await this.prisma.credential.update({
      where: { id: credential.id },
      data: { 
        lastLoginAt: new Date(),
        failedAttempts: 0,
        lockoutExpires: null 
      }
    });

    this.logger.log(`[AUTH] Identity and Profile validated successfully for: ${email}`);
    
    return fullProfileDto;

  } catch (err: unknown) {
    // Re-throw specific UnauthorizedExceptions (like Lockout messages)
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

  const fullName = `${userData.firstName} ${userData.lastName}`.trim();

  // 1. Fetch the User Role via gRPC
  const rbacService = this.getRbacGrpcService();
  const userRoleResponse = await firstValueFrom(
    rbacService.getUserRole({ userUuid: userData.uuid }),
  );
  const roleType = userRoleResponse?.role?.roleType ?? 'Individual';

  const tokenId = `${userData.uuid}-${Date.now()}`;

  // 2. Prepare JWT Payload
  const payload: JwtPayload = {
    userUuid: userData.uuid,
    email: userData.email,
    role: roleType,
    tokenId: tokenId,
    accountId: accountData.uuid,
    userName: fullName,
    organizationUuid: orgData?.uuid,
    accountName: accountData.type === 'ORGANIZATION' && orgData?.name 
      ? orgData.name 
      : fullName,
    accountType: accountData.type as 'INDIVIDUAL' | 'ORGANIZATION',
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
      
      // Basic client info (already present)
      device: clientInfo?.device,
      ipAddress: clientInfo?.ipAddress,
      userAgent: clientInfo?.userAgent,
      os: clientInfo?.os,
      
      // NEW rich client info fields
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
   INDIVIDUAL SIGNUP (With Transactional OTP Verification)
====================================================== */
async signup(
  signupDto: UserSignupRequestDto,
  clientInfo?: AuthClientInfoDto
): Promise<BaseResponseDto<SignupResponseDto>> {
  const profileGrpcService = this.getProfileGrpcService();
  
  let profileType: string | null = null;
  let profileDataForEmail: any = null;

  this.logger.log(`📝 Signup attempt: ${signupDto.email}`);

  try {
    // 1. Verify OTP
    const validOtp = await this.prisma.otp.findFirst({
      where: {
        email: signupDto.email,
        code: signupDto.code,
        purpose: 'SIGNUP',
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });

    if (!validOtp) {
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

    // 2. Build the CreateAccountWithProfilesRequestDto
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

    // 3. Create account via gRPC (parallel with password hash)
    const [hashedPassword, profileResponse] = await Promise.all([
      bcrypt.hash(signupDto.password, 10),
      firstValueFrom(profileGrpcService.createIndividualAccountWithProfiles(createAccountDto))
    ]);

    if (!profileResponse.success || !profileResponse.data) {
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
      this.logger.error(`[PROFILE RESPONSE] No user found in account data for ${signupDto.email}`);
      return BaseResponseDto.fail('Invalid response from profile service', 'INTERNAL_ERROR');
    }

    // 4. Save credentials and cleanup OTP
    await this.prisma.$transaction([
      this.prisma.credential.create({
        data: {
          userUuid: userData.uuid,
          passwordHash: hashedPassword,
          email: signupDto.email,
          mfaEnabled: true,
        },
      }),
      this.prisma.otp.deleteMany({
        where: { email: signupDto.email, purpose: 'SIGNUP' },
      }),
    ]);

    // ============ PREMIUM BRANCH: PAYMENT HAND-OFF ============
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

        // Queue payment pending email
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

        // Queue admin notification
        const adminEmail = process.env.PIVOTA_ADMIN_NOTIFICATION_EMAIL || 'allanmathenge67@gmail.com';
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
            paymentStatus: 'PENDING',
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: true,
            removeOnFail: false,
          }
        );

        // Queue analytics event
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
            paymentStatus: 'PENDING',
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

        return BaseResponseDto.ok(
          {
            message: 'Account created. Complete payment to activate.',
            redirectUrl: paymentInitResponse.data.redirectUrl,
            merchantReference: paymentInitResponse.data.merchantReference,
          } as any,
          'Payment required to activate account',
          'PAYMENT_REQUIRED'
        );

      } catch (paymentErr: unknown) {
        const message = paymentErr instanceof Error ? paymentErr.message : 'Payment service unreachable';
        this.logger.error(`[PAYMENT SERVICE DOWN] User ${signupDto.email}: ${message}`);

        // Queue payment failed email
        await this.queue.addJob(
          'email-queue',
          'payment-failed-email',
          {
            to: signupDto.email,
            firstName: signupDto.firstName,
            lastName: signupDto.lastName,
            plan: targetPlanSlug,
            profileType: profileType,
            errorMessage: message,
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: true,
            removeOnFail: false,
          }
        );

        // Queue admin notification about payment failure
        const adminEmail = process.env.PIVOTA_ADMIN_NOTIFICATION_EMAIL || 'allanmathenge67@gmail.com';
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
            paymentStatus: 'FAILED',
            paymentError: message,
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: true,
            removeOnFail: false,
          }
        );

        // Queue analytics event for payment failure
        await this.queue.addJob(
          'analytics-queue',
          'payment-failed',
          {
            userUuid: userData.uuid,
            email: signupDto.email,
            accountId: accountData.accountCode,
            plan: targetPlanSlug,
            profileType: profileType,
            error: message,
            timestamp: new Date().toISOString()
          },
          {
            attempts: 2,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: true,
            removeOnFail: true,
          }
        );

        return BaseResponseDto.ok(
          {
            message: 'Account created. Payment system busy. Please login to complete payment.',
            redirectUrl: null,
          } as any,
          'Account created. Payment service offline.',
          'PAYMENT_SERVICE_OFFLINE'
        );
      }
    }

    // ============ FREE PLAN - QUEUE BACKGROUND JOBS ============
    
    // Queue welcome email
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

    // Queue admin notification
    const adminEmail = process.env.PIVOTA_ADMIN_NOTIFICATION_EMAIL || 'allanmathenge67@gmail.com';
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

    // Queue analytics event
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

    this.logger.log(`✅ Signup completed: ${signupDto.email}`);

    return BaseResponseDto.ok(
      { message: 'Signup successful' } as any,
      'Signup successful',
      'CREATED'
    );

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unexpected failure';
    this.logger.error(`[AUTH SIGNUP CRASH] ${errorMessage}`);

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
      
      // Track failed org signup in KAFKA (analytics)
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
    
    // 3. Call Profile Service with the correct method
    const orgResponse = await firstValueFrom(
      profileGrpcService.createOrganizationAccountWithProfiles(createOrgProfileReq),
    );

    // Properly capture Profile Service failures (duplicates, etc.)
    if (!orgResponse.success || !orgResponse.data) {
      // Track profile failure in KAFKA
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

    // 4. Save Admin Credentials Locally
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    await this.prisma.credential.create({
      data: {
        userUuid: adminUserUuid,
        email: dto.email,
        passwordHash: hashedPassword,
        mfaEnabled: true,
      },
    });

    // 5. CLEANUP OTP
    await this.prisma.otp.deleteMany({
      where: { email: dto.email, purpose: 'ORGANIZATION_SIGNUP' }
    });

    /* ======================================================
       6. PREMIUM BRANCH: PAYMENT HAND-OFF
    ====================================================== */
    if (orgResponse.code === 'PAYMENT_REQUIRED') {
      try {
        const paymentPayload = {
          accountUuid: orgResponse.data.account.uuid,
          userUuid: orgResponse.data.admin.uuid,
          email: dto.email,
          firstName: dto.adminFirstName,
          lastName: dto.adminLastName,
          planSlug: dto.planSlug,
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

        // Track premium org signup in KAFKA
        this.kafkaClient.emit('organization.signup.premium', {
          organizationUuid: orgResponse.data.uuid,
          organizationName: dto.name,
          adminEmail: dto.email,
          adminUserUuid,
          plan: dto.planSlug,
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
            organization: orgResponse.data,
            admin: orgResponse.data.admin,
            account: orgResponse.data.account,
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
            organization: orgResponse.data,
            admin: orgResponse.data.admin,
            account: orgResponse.data.account,
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

    // ✅ Send organization welcome email via RabbitMQ - NO client info
    this.notificationBus.emit('organization.onboarded', {
      accountId: orgResponse.data.account.accountCode,
      name: dto.name,
      adminFirstName: orgResponse.data.admin.firstName,
      adminEmail: dto.email,
      orgEmail: dto.officialEmail,
      plan: 'Free Forever',
    });

    // ✅ Send admin notification via RabbitMQ - New organization registration
    this.notificationBus.emit('admin.new.organization.registration', {
      recipientEmail: process.env.PIVOTA_ADMIN_NOTIFICATION_EMAIL || 'allanmathenge67@gmail.com',
      organizationName: dto.name,
      adminName: `${dto.adminFirstName} ${dto.adminLastName}`,
      adminEmail: dto.email,
      organizationEmail: dto.officialEmail,
      registrationDate: new Date().toISOString(),
      plan: 'Free Forever'
    });

    // ✅ Send analytics via Kafka - WITH client info
    this.kafkaClient.emit('organization.registered', {
      organizationUuid: orgResponse.data.uuid,
      organizationName: dto.name,
      adminUserUuid,
      adminEmail: dto.email,
      accountId: orgResponse.data.account.accountCode,
      plan: dto.planSlug || 'free-forever',
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

    // 8. Return Success Response
    return BaseResponseDto.ok(
      {
        organization: {
          id: String(orgResponse.data.id),
          uuid: orgResponse.data.uuid,
          name: orgResponse.data.name,
          orgCode: orgResponse.data.orgCode,
          verificationStatus: orgResponse.data.verificationStatus,
          type: orgResponse.data.type,
          officialEmail: orgResponse.data.officialEmail,
          officialPhone: orgResponse.data.officialPhone,
          physicalAddress: orgResponse.data.physicalAddress,
          website: orgResponse.data.website,
          about: orgResponse.data.about,
          logo: orgResponse.data.logo,
        },
        admin: {
          uuid: orgResponse.data.admin.uuid,
          email: orgResponse.data.admin.email,
          roleName: orgResponse.data.admin.roleName,
          userCode: orgResponse.data.admin.userCode,
          firstName: orgResponse.data.admin.firstName,
          lastName: orgResponse.data.admin.lastName,
          phone: orgResponse.data.admin.phone
        },
        account: {
          uuid: orgResponse.data.account.uuid,
          type: orgResponse.data.account.type,
          accountCode: orgResponse.data.account.accountCode,
        }
      } as OrganizationSignupDataDto,
      'Organization and Admin User created successfully',
      'CREATED'
    );

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected Auth failure';
    this.logger.error(`[ORG SIGNUP CRASH] ${message}`);

    // Track error in KAFKA
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

  // ------------------ Unified Login ------------------
async login(
  loginDto: LoginRequestDto,
): Promise<BaseResponseDto<LoginResponseDto>> {
  this.logger.debug(`Login attempt for: ${loginDto.email}`);

  try {
    // 1. Validate Credentials
    const profile = await this.validateUser(loginDto.email, loginDto.password);

    if (!profile) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Trigger MFA Challenge
    await this.requestOtp({
      email: loginDto.email,
      purpose: '2FA',
    });

    this.logger.log(`MFA challenge sent to: ${loginDto.email}`);

    // 3. Return lean MFA response - only what's needed for frontend
    return BaseResponseDto.ok(
    { 
      message: 'MFA_REQUIRED',
      email: profile.user.email,
      uuid: profile.user.uuid
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

    if (err instanceof RpcException || (err as any)?.code !== undefined) {
      const rpcErr = (err instanceof RpcException ? err.getError() : err) as any;
      return BaseResponseDto.fail(
        'Identity service communication failure',
        'SERVICE_UNAVAILABLE',
        { code: String(rpcErr.code), message: rpcErr.message }
      );
    }

    return BaseResponseDto.fail(
      'Internal server error',
      'INTERNAL_ERROR',
      { code: 'INTERNAL', message: err instanceof Error ? err.message : 'Login failed' }
    );
  }
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
          userUuid: payload.userUuid, 
          revoked: false,
          expiresAt: { gt: new Date() } // Ensure session hasn't naturally expired in DB
        },
      });

      // 3. Verify the hashed token matches the one in our database
      const validSession = sessions.find((s) => bcrypt.compareSync(refreshToken, s.hashedToken));
      
      if (!validSession) {
        this.logger.warn(`[AUTH] Refresh attempt with invalid/revoked token for user: ${payload.userUuid}`);
        throw new UnauthorizedException('Invalid or revoked refresh token');
      }

      // 4. Update the "Last Active" timestamp for the current session
      // This confirms the user is still active on this specific device/connection
      await this.prisma.session.update({
        where: { id: validSession.id },
        data: { lastActiveAt: new Date() }
      });

      // 5. Fetch fresh user profile details via gRPC
      const userGrpcService = this.getProfileGrpcService();
      const profileResponse = await firstValueFrom(
        userGrpcService.getUserProfileByUuid({ userUuid: payload.userUuid })
      );

      if (!profileResponse?.success || !profileResponse.data) {
        throw new UnauthorizedException('User profile no longer exists');
      }

      // 6. Issue a New Token Pair
      // Pass the existing session context (device, ip, etc.) to the new session record
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
      // This prevents the same refresh token from being used multiple times
      await this.prisma.session.update({
        where: { id: validSession.id },
        data: { revoked: true }
      });

      return {
        success: true,
        message: 'Tokens refreshed successfully',
        code: 'OK',
        data: tokens, // Standardized to 'data' to match your other DTOs
        error: null,
      } as BaseResponseDto<TokenPairDto>;

    } catch (err: unknown) {
      this.logger.error(`[AUTH] Refresh Token Error: ${err instanceof Error ? err.message : 'Unknown'}`);
      
      if (err instanceof UnauthorizedException) {
        return {
          success: false,
          message: err.message,
          code: 'UNAUTHORIZED',
          data: null as any,
          error: { code: 'AUTH_FAILURE', message: err.message }
        } as BaseResponseDto<TokenPairDto>;
      }

      return {
        success: false,
        message: 'Token refresh failed due to a system error',
        code: 'INTERNAL',
        data: null as any,
        error: { 
          code: 'INTERNAL', 
          message: err instanceof Error ? err.message : 'Refresh failed' 
        },
      } as BaseResponseDto<TokenPairDto>;
    }
  }

async signInWithGoogle(
  idToken: string, 
  clientInfo?: AuthClientInfoDto
): Promise<BaseResponseDto<LoginResponseDto>> {
  try {
    const profileGrpc = this.getProfileGrpcService();
    
    // 1. VERIFY GOOGLE TOKEN
    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: [
        process.env.GOOGLE_CLIENT_ID,
        '407408718192.apps.googleusercontent.com'
      ]
    });
    
    const payload = ticket.getPayload(); 
    if (!payload || !payload.email) {
      throw new UnauthorizedException('Invalid Google token');
    }

    const { sub: googleProviderId, email, given_name, family_name } = payload;
    let profileData: UserProfileResponseDto;
    let isNewProvisioning = false;

    // 2. IDENTITY LOOKUP
    const credential = await this.prisma.credential.findFirst({
      where: {
        OR: [{ googleProviderId }, { email }]
      }
    });

    if (credential) {
      // --- PATH A: EXISTING CREDENTIAL ---
      if (!credential.googleProviderId) {
        await this.prisma.credential.update({
          where: { id: credential.id },
          data: { googleProviderId }
        });
        this.logger.log(`[Google Auth] Linked Google ID to existing email: ${email}`);
      }

      const profileResponse = await firstValueFrom(
        profileGrpc.getUserProfileByUuid({ userUuid: credential.userUuid })
      );
      profileData = profileResponse.data;

      // Track existing user login in Kafka
      this.kafkaClient.emit('user.login.google', {
        userUuid: credential.userUuid,
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
      // --- PATH B: NO CREDENTIAL FOUND ---
      try {
        const existingProfile = await firstValueFrom(
          profileGrpc.getUserProfileByEmail({ email })
        );

        if (existingProfile?.success && existingProfile.data) {
          profileData = existingProfile.data;
          await this.prisma.credential.create({
            data: { 
              userUuid: profileData.user.uuid, 
              email, 
              googleProviderId,
              mfaEnabled: true,
              passwordHash: null 
            },
          });
          this.logger.log(`[Google Auth] Anchored Google login to pre-existing profile: ${email}`);
          
          // Track linked account in Kafka
          this.kafkaClient.emit('user.account.linked', {
            userUuid: profileData.user.uuid,
            email,
            provider: 'GOOGLE',
            clientInfo: clientInfo ? {
              device: clientInfo.device,
              deviceType: clientInfo.deviceType,
              os: clientInfo.os,
              browser: clientInfo.browser,
              isBot: clientInfo.isBot
            } : null,
            timestamp: new Date().toISOString()
          });
        }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (profileErr) {
        // Truly brand new user
        isNewProvisioning = true;
        this.logger.log(`[Google Auth] New user detected: ${email}. Provisioning...`);
        
        const userUuid = randomUUID();

        // Build the CreateAccountWithProfilesRequestDto for Google signup using oneof fields
        const createAccountDto: CreateAccountWithProfilesRequestDto = {
          accountType: 'INDIVIDUAL',
          email: email,
          password: '', // No password for Google signup
          phone: null,
          planSlug: 'free-forever',
          otpCode: '', // No OTP needed for Google signup
          firstName: given_name || 'User',
          lastName: family_name || '',
          profileImage: null,
          primaryPurpose: undefined, // No purpose set yet
          // No profile data fields are set initially for Google signup
          profiles: [], // No profiles created initially for Google signup
        };

        // Call the method for creating individual account with profiles
        const createResponse = await firstValueFrom(
          profileGrpc.createIndividualAccountWithProfiles(createAccountDto)
        );

        if (!createResponse.success || !createResponse.data) {
          throw new Error('Profile creation failed via gRPC');
        }

        await this.prisma.credential.create({
          data: { userUuid, email, googleProviderId, mfaEnabled: true, passwordHash: null },
        });

        const fullProfile = await firstValueFrom(
          profileGrpc.getUserProfileByUuid({ userUuid })
        );
        profileData = fullProfile.data;

        // ✅ Send welcome email via RabbitMQ - NO client info
        this.notificationBus.emit('user.onboarded', {
          accountId: profileData.account.accountCode,
          firstName: profileData.user.firstName,
          email: profileData.user.email,
          plan: 'Free Forever',
        });

        // ✅ Send admin notification via RabbitMQ - New user registration
        this.notificationBus.emit('admin.new.registration', {
          recipientEmail: process.env.ADMIN_NOTIFICATION_EMAIL || 'admin@pivotaconnect.com',
          userEmail: email,
          userName: `${given_name || 'User'} ${family_name || ''}`.trim(),
          accountType: 'INDIVIDUAL',
          registrationMethod: 'GOOGLE',
          registrationDate: new Date().toISOString(),
          plan: 'Free Forever'
        });

        // ✅ Track new user registration in Kafka - WITH client info
        this.kafkaClient.emit('user.registered', {
          userUuid,
          email,
          accountId: profileData.account.accountCode,
          plan: 'free-forever',
          registrationMethod: 'GOOGLE',
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
    }

    // 3. GENERATE SESSIONS & TOKENS
    const { accessToken, refreshToken } = await this.generateTokens(profileData, clientInfo);

    // 4. TRIGGER LOGIN NOTIFICATION (Consistent with manual login)
    // Only send "New Login" email if it's NOT a brand new signup (avoid double emailing)
    if (!isNewProvisioning) {
      const isOrgAccount = profileData.account.type === 'ORGANIZATION';
      const adminRoles = ['Business System Admin'];
      const isUserAdmin = isOrgAccount && adminRoles.includes(profileData.user.roleName);

      const loginEmailPayload = {
        to: profileData.user.email,
        firstName: profileData.user.firstName || 'User',
        lastName: profileData.user.lastName || '',
        organizationName: isOrgAccount ? profileData.organization?.name : undefined,
        orgEmail: isUserAdmin ? profileData.organization?.officialEmail : undefined,
        subject: isUserAdmin
          ? `SECURITY: Admin Login to ${profileData.organization?.name}` 
          : 'New Login to Your Pivota Account (via Google)',
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

      this.logger.log(`[RMQ Emit] Sending Google login notification for: ${loginEmailPayload.to}`);
      this.notificationBus.emit('user.login.email', loginEmailPayload);
    }

    return {
      success: true,
      message: 'Authentication successful',
      code: 'OK',
      data: {
        id: profileData.user.uuid,
        uuid: profileData.user.uuid,
        userCode: profileData.user.userCode,
        accountId: profileData.account.uuid,
        email: profileData.user.email,
        firstName: profileData.user.firstName,
        lastName: profileData.user.lastName,
        phone: profileData.user.phone,
        status: profileData.user.status,
        createdAt: profileData.createdAt,
        updatedAt: profileData.updatedAt,
        accessToken,
        refreshToken,
        organization: profileData.organization ? {
          uuid: profileData.organization.uuid,
          name: profileData.organization.name,
          orgCode: profileData.organization.orgCode,
          verificationStatus: profileData.organization.verificationStatus,
        } : undefined
      },
    } as BaseResponseDto<LoginResponseDto>;

  } catch (err) {
    const errorMessage = err.details || err.message;
    this.logger.error(`[Google Auth] Failure: ${errorMessage}`);

    // Track error in Kafka
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
    const fullName = `${userData.firstName} ${userData.lastName}`.trim();

    // 2. Generate Dev Token ID
    const devTokenId = `dev-${userUuid}-${Date.now()}`;
 
    // 3. Prepare Payload
    const payload: JwtPayload = {
      userUuid,
      email,
      role,
      accountId,
      organizationUuid,
      tokenId: devTokenId,
      userName: fullName,
      accountName: accountData.type === 'ORGANIZATION' ? organizationData.name : fullName,
      accountType: accountData.type
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

// apps/auth-service/src/auth.service.ts (find your requestOtp method)

async requestOtp(data: RequestOtpDto & { purpose: string }): Promise<BaseResponseDto<null>> {
  const { email, purpose } = data; 
  const startTime = Date.now();

  try {
    // 1. Check user existence
    const existingUser = await this.prisma.credential.findUnique({
      where: { email },
      select: { id: true },
    });

    // 2. Business Logic
    switch (purpose) {
      case 'SIGNUP':
      case 'ORGANIZATION_SIGNUP':
        if (existingUser) {
          this.logger.warn(`[OTP] ${purpose} blocked: ${email} already exists.`);
          return BaseResponseDto.fail('This email is already registered.', 'CONFLICT');
        }
        break;

      case 'PASSWORD_RESET':
        if (!existingUser) {
          this.logger.log(`[OTP] Password reset requested for non-existent: ${email}`);
          return BaseResponseDto.ok(null, 'If an account exists, a code has been sent.');
        }
        break;

      case '2FA':
        if (!existingUser) {
          return BaseResponseDto.fail('Account not found.', 'NOT_FOUND');
        }
        break;

      case 'CHANGE_EMAIL':
        if (existingUser) {
          return BaseResponseDto.fail('This email is already in use.', 'CONFLICT');
        }
        break;
 
      case 'CHANGE_PHONE':
        if (!existingUser) {
          return BaseResponseDto.fail('User account not found.', 'NOT_FOUND');
        }
        break;

      default:
        this.logger.error(`[OTP] Unsupported purpose: ${purpose}`);
        return BaseResponseDto.fail('Invalid request purpose.', 'BAD_REQUEST');
    }

    // 3. Rate limiting with Redis
    const rateLimitResult = await this.queue.checkRateLimit(
      email, `otp_${purpose}`, 3, 600
    );
    
    if (!rateLimitResult.allowed) {
      const minutesLeft = Math.ceil(rateLimitResult.resetInSeconds / 60);
      return BaseResponseDto.fail(
        `Too many attempts. Try again in ${minutesLeft} minutes.`,
        'TOO_MANY_REQUESTS'
      );
    }
    
    // 4. Generate OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60000);

    // 5. UPSERT - Single database operation (requires unique constraint on email + purpose)
    await this.prisma.otp.upsert({
      where: {
        email_purpose: { email, purpose }  // Uses the unique constraint
      },
      update: {
        code: otpCode,
        expiresAt: expiresAt,
        createdAt: now,  // Update timestamp on resend
      },
      create: {
        email,
        code: otpCode,
        purpose,
        expiresAt,
        createdAt: now,
      },
    });

    // 6. Log request (fire and forget)
    this.prisma.otpRequestLog.create({
      data: { email, purpose, createdAt: now },
    }).catch(err => this.logger.debug(`Log failed: ${err.message}`));

    // 7. Queue email (fire and forget)
    await this.queue.addJob(
      'email-queue',
      'send-otp',
      {
        to: email,
        code: otpCode,
        purpose: purpose,
        // Remove firstName - not available in OTP request
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      }
    );

    // 8. Clean up old logs (fire and forget)
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

    return BaseResponseDto.ok(null, 'Verification code sent to your email');

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Failed to generate OTP for ${email}: ${message}`);
    return BaseResponseDto.fail('An error occurred while processing your request', 'INTERNAL_ERROR');
  }
}




/** ------------------ Verify OTP ------------------ */
async verifyOtp(data: VerifyOtpDto & { purpose: string }): Promise<BaseResponseDto<{ verified: boolean }>> {
  const { email, code, purpose } = data;

  try {
    /**
     * 1. Find the latest valid OTP.
     * We strictly use the provided 'purpose' (SIGNUP, ORGANIZATION_SIGNUP, PASSWORD_RESET, etc.)
     * to ensure the security context remains isolated.
     */
    const latestOtp = await this.prisma.otp.findFirst({
      where: {
        email,
        code,
        purpose, // Strict match against the validated purpose
        expiresAt: { gt: new Date() }, // Check if the current time is before expiry
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestOtp) {
      this.logger.warn(`[AUTH] Failed verification for: ${email} | Purpose: ${purpose} | Code: ${code}`);
      return {
        success: false,
        message: 'Invalid or expired verification code.',
        code: 'UNAUTHORIZED',
        data: { verified: false },
      } as BaseResponseDto<{ verified: boolean }>;
    }

    /**
     * 2. OTP is valid!
     * NOTE: We do NOT delete the OTP here to support multiple validations
     * (e.g., admin testing, resend scenarios, etc.)
     * The OTP should only be deleted after the actual operation completes
     * (signup, password reset, etc.)
     */
    this.logger.log(`[AUTH] OTP verified successfully: ${email} [${purpose}] (NOT deleted - validation only)`);

    return {
      success: true,
      message: 'Verification successful',
      code: 'OK',
      data: { verified: true },
    } as BaseResponseDto<{ verified: boolean }>;

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown validation error';
    this.logger.error(`Error verifying OTP for ${email}: ${errorMsg}`);
    
    // Throwing RpcException for gRPC protocol mapping
    throw new RpcException({ code: 13, message: 'Internal validation failure' });
  }
}

async verifyMfaLogin(
  verifyDto: VerifyOtpDto,
  clientInfo?: AuthClientInfoDto
): Promise<BaseResponseDto<LoginResponseDto>> {
  this.logger.debug(`MFA verification for: ${verifyDto.email}`);

  try {
    // 1. OPTIMIZED: Verify OTP - select only what we need
    const validOtp = await this.prisma.otp.findFirst({
      where: {
        email: verifyDto.email,
        code: verifyDto.code,
        purpose: '2FA',
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });

    if (!validOtp) {
      return BaseResponseDto.fail(
        'Invalid or expired verification code',
        'UNAUTHORIZED',
        { code: 'INVALID_OTP' }
      );
    }

    // 2. Get user credential
    const credential = await this.prisma.credential.findUnique({
      where: { email: verifyDto.email },
      select: { userUuid: true },
    });

    if (!credential) {
      return BaseResponseDto.fail('User not found', 'NOT_FOUND');
    }

    // 3. Fetch user profile
    let profileResponse;
    try {
      profileResponse = await firstValueFrom(
        this.getProfileGrpcService().getUserProfileByUuid({ userUuid: credential.userUuid })
      );
    } catch (grpcError) {
      this.logger.error(`gRPC error: ${grpcError.message}`);
      return BaseResponseDto.fail('Profile service unavailable', 'SERVICE_UNAVAILABLE');
    }

    if (!profileResponse?.success || !profileResponse.data) {
      return BaseResponseDto.fail('User profile not found', 'NOT_FOUND');
    }

    const profile = profileResponse.data;
    const userData = profile.user;

    // Check user status
    if (userData.status !== 'ACTIVE') {
      return BaseResponseDto.fail(
        `Account is ${userData.status.toLowerCase()}`,
        'ACCOUNT_INACTIVE'
      );
    }

    // 4. Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(profile, clientInfo);

    // 5. Fire-and-forget notifications (don't await)
    this.sendLoginNotification(userData, profile, clientInfo);

    // 6. Clean up OTP
    await this.prisma.otp.delete({ where: { id: validOtp.id } });

    // 7. Return lean response with only tokens
    return BaseResponseDto.ok(
      { accessToken, refreshToken } as LoginResponseDto,
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
    // Verify user exists before sending email
    const credential = await this.prisma.credential.findUnique({ where: { email: dto.email } });
    if (!credential) {
      // Security best practice: don't reveal if email exists, just say "If account exists..."
      return BaseResponseDto.ok(null, 'If an account exists, a reset code has been sent.');
    }

    return this.requestOtp({ email: dto.email, purpose: 'PASSWORD_RESET' });
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
      return;
    }

    // 2. Generate a password setup token (48 hour expiry)
    const setupToken = randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    // 3. Create credential record with NO password hash
    // Password will be set via setup flow - we don't need to store the result in a variable
    await this.prisma.credential.create({
      data: {
        userUuid: data.userUuid,
        email: data.email,
        passwordHash: null, // No password yet
        mfaEnabled: true,
        failedAttempts: 0,
        lastLoginAt: null,
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

    // 5. Create audit record (optional)
    await this.prisma.invitationAudit.create({
      data: {
        email: data.email,
        userUuid: data.userUuid,
        organizationUuid: data.organizationUuid,
        invitedByUserUuid: 'system', // You might want to pass this
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      },
    });

    // 6. Emit event to send password setup email
    this.notificationBus.emit('user.password.setup.required', {
      email: data.email,
      userUuid: data.userUuid,
      firstName: data.firstName,
      setupToken,
      expiresAt: expiresAt.toISOString(),
      organizationName: data.organizationName,
    });

    this.logger.log(`[INVITE] Password setup token created for ${data.email}`);

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
  firstName: string;
  lastName: string;
  phone: string;
  organizationName: string;
}): Promise<BaseResponseDto<null>> {
  this.logger.log(`[gRPC] Creating credentials for invited user: ${data.email}`);
  
  try {
    await this.handleInvitationAcceptedNewUser({
      ...data,
      organizationUuid: '', // You might need this
      roleName: 'GeneralUser',
    });
    
    return BaseResponseDto.ok(null, 'Credentials created successfully', 'OK');
  } catch (error) {
    return BaseResponseDto.fail(error.message, 'INTERNAL_ERROR');
  }
}
}