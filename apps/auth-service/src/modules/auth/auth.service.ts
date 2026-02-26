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
import { PrismaService } from '../../prisma/prisma.service';
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
  UserSignupDataDto,
  CreateUserRequestDto,
  UserSignupRequestDto,
  UserLoginEmailDto,
  UserProfileResponseDto,
  VerifyOtpDto,
  RequestOtpDto,
  SendOtpEventDto,
  ResetPasswordDto,
  SetupPasswordRequestDto,
} from '@pivota-api/dtos';
import { firstValueFrom, lastValueFrom, map, Observable } from 'rxjs';
import { BaseGetUserRoleReponseGrpc, JwtPayload } from '@pivota-api/interfaces';
import { randomUUID } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import * as dotenv from 'dotenv';
import { HttpService } from '@nestjs/axios';

dotenv.config({ path: `.env.${process.env.NODE_ENV || 'dev'}` });

// ---------------- gRPC Interfaces ----------------
interface ProfileServiceGrpc {
  createUserProfile(data: CreateUserRequestDto): Observable<BaseResponseDto<UserSignupDataDto>>;

  createOrganizationProfile(
    data: CreateOrganisationRequestDto,
  ): Observable<BaseResponseDto<OrganizationProfileResponseDto>>;



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
 


  constructor(
  private readonly jwtService: JwtService,
  private readonly prisma: PrismaService,
  private readonly httpService: HttpService,
  
  // gRPC Clients
  @Inject('PROFILE_GRPC')
   private readonly grpcClient: ClientGrpc,
   
  @Inject('RBAC_PACKAGE') 
  private readonly rbacClient: ClientGrpc,

  @Inject('NOTIFICATION_EVENT_BUS') private readonly notificationBus: ClientProxy,
) {}

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
  clientInfo?: Pick<SessionDto, 'device' | 'ipAddress' | 'userAgent' | 'os'>,
): Promise<{ accessToken: string; refreshToken: string }> {
  const userData = profile.user;
  const accountData = profile.account;
  const orgData = profile.organization; // This might be undefined

  this.logger.debug(`[AUTH] Generating tokens for User: ${userData.uuid} in Account: ${accountData.uuid}`);

  const fullName = `${userData.firstName} ${userData.lastName}`.trim();

  // 1. Fetch the User Role via gRPC
  const rbacService = this.getRbacGrpcService();
  const userRoleResponse = await firstValueFrom(
    rbacService.getUserRole({ userUuid: userData.uuid }),
  );
  const roleType = userRoleResponse?.role?.roleType ?? 'GeneralUser';

  const tokenId = `${userData.uuid}-${Date.now()}`;

  // 2. Prepare JWT Payload - SAFELY handle undefined organization
  const payload: JwtPayload = {
    userUuid: userData.uuid,
    email: userData.email,
    role: roleType,
    tokenId: tokenId,
    accountId: accountData.uuid,
    userName: fullName,
    // ✅ SAFE: Use optional chaining
    organizationUuid: orgData?.uuid,
    // ✅ SAFE: Check if orgData exists before accessing name
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

  // 5. CREATE SESSION
  await this.prisma.session.create({
    data: {
      userUuid: userData.uuid,
      tokenId: tokenId,
      hashedToken,
      device: clientInfo?.device,
      ipAddress: clientInfo?.ipAddress,
      userAgent: clientInfo?.userAgent,
      os: clientInfo?.os,
      lastActiveAt: new Date(),
      expiresAt,
      revoked: false,
    },
  });

  this.logger.debug(`[AUTH] Session ${tokenId} created for User: ${userData.uuid}`);

  return { accessToken, refreshToken };
}

/* ======================================================
   INDIVIDUAL SIGNUP (With Transactional OTP Verification)
====================================================== */
async signup(
  signupDto: UserSignupRequestDto,
): Promise<BaseResponseDto<UserSignupDataDto>> {
  const profileGrpcService = this.getProfileGrpcService();

  try {
    // 1. VERIFY OTP
    const validOtp = await this.prisma.otp.findFirst({
      where: {
        email: signupDto.email,
        code: signupDto.code,
        purpose: 'SIGNUP',
        expiresAt: { gt: new Date() },
      },
    });

    if (!validOtp) {
      this.logger.warn(`[AUTH] Blocked signup attempt: Invalid/Expired OTP for ${signupDto.email}`);
      return BaseResponseDto.fail(
        'Invalid or expired verification code.', 
        'UNAUTHORIZED', 
        { code: 'INVALID_OTP' }
      );
    }

    // 2. Anchor Identity
    const userUuid = randomUUID();

    // 3. Call Profile Service
    const profileResponse = await firstValueFrom(
      profileGrpcService.createUserProfile({
        userUuid: userUuid,
        email: signupDto.email,
        firstName: signupDto.firstName,
        lastName: signupDto.lastName,
        phone: signupDto.phone,
        planSlug: signupDto.planSlug,
      }),
    );

    // CAPTURE PROFILE SERVICE FAILURES PROPERLY
    if (!profileResponse.success || !profileResponse.data) {
      this.logger.error(`[PROFILE FAIL] ${signupDto.email}: ${profileResponse.message}`);
      
      // Forward the exact message and code from the profile service (e.g., "A user with this phone number already exists")
      return BaseResponseDto.fail(
        profileResponse.message, 
        profileResponse.code, 
        profileResponse.error
      );
    }

    // 4. Save Credentials Locally
    const hashedPassword = await bcrypt.hash(signupDto.password, 10);
    await this.prisma.credential.create({
      data: {
        userUuid: userUuid,
        passwordHash: hashedPassword,
        email: signupDto.email,
        mfaEnabled: true,
      },
    });

    // 5. CLEANUP
    await this.prisma.otp.deleteMany({
      where: { email: signupDto.email, purpose: 'SIGNUP' },
    });

    /* ======================================================
       6. PREMIUM BRANCH: PAYMENT HAND-OFF
    ====================================================== */ 
    if (profileResponse.code === 'PAYMENT_REQUIRED') {
      try {
        const paymentPayload = {
          accountUuid: profileResponse.data.account.uuid,
          merchantReference: userUuid, 
          email: signupDto.email,     
          firstName: signupDto.firstName, 
          lastName: signupDto.lastName,  
          phone: signupDto.phone, 
          amount: 10, 
          currency: 'KES',
          planSlug: signupDto.planSlug, 
          description: `PivotaConnect ${signupDto.planSlug} Subscription`,
          callbackurl: 'https://app.pivota.com/onboarding/payment-status'
        }; 

        this.logger.log(`[PAYMENT] Attempting to hit Spring Boot at: ${process.env.PAYMENT_SERVICE_URL}/api/v1/payments/initiate`);
        this.logger.debug(`[PAYMENT] Outgoing Payload: ${JSON.stringify(paymentPayload)}`);

        const paymentInitResponse = await lastValueFrom(
          this.httpService.post(
            `${process.env.PAYMENT_SERVICE_URL}/api/v1/payments/initiate`,
            paymentPayload,
            { 
              headers: { 
                'Content-Type': 'application/json' 
              } 
            }
          ).pipe(
            map(res => {
              this.logger.log(`[PAYMENT] Spring Boot Status: ${res.status}`);
              this.logger.debug(`[PAYMENT] Spring Boot Response: ${JSON.stringify(res.data)}`);
              return res.data; 
            })
          )
        );


        return BaseResponseDto.ok(
          {
            account: profileResponse.data.account,
            user: profileResponse.data.user,
            redirectUrl: paymentInitResponse.redirectUrl,
            merchantReference: paymentInitResponse.merchantReference,
          } as UserSignupDataDto,
          'Payment required to activate account',
          'PAYMENT_REQUIRED'
        );

      } catch (paymentErr: unknown) {
        // Detailed error logging to troubleshoot ngrok/Spring Boot connection
        const errorMessage = paymentErr instanceof Error ? paymentErr.message : 'Unknown error';
        const errorData = paymentErr['response']?.data;
        
        this.logger.error(`[PAYMENT BRIDGE DOWN] ${signupDto.email}: ${errorMessage}`);
        if (errorData) {
          this.logger.error(`[PAYMENT ERROR DETAILS] ${JSON.stringify(errorData)}`);
        }

        return BaseResponseDto.ok(
          {
            account: profileResponse.data.account,
            user: profileResponse.data.user,
            profile: profileResponse.data.profile,
            completion: profileResponse.data.completion,
            redirectUrl: null,
          } as UserSignupDataDto,
          'Account created. Our payment system is busy. Please login to subscribe.',
          'PAYMENT_SERVICE_OFFLINE'
        );
      }
    }

    /* ======================================================
       7. FREEMIUM BRANCH: NOTIFICATION
    ====================================================== */
    this.notificationBus.emit('user.onboarded', {
      accountId: profileResponse.data.account.accountCode,
      firstName: signupDto.firstName,
      email: signupDto.email,
      plan: 'Free Forever',
    });

    return BaseResponseDto.ok(
      {
        account: profileResponse.data.account,
        user: profileResponse.data.user,
        profile: profileResponse.data.profile,
        completion: profileResponse.data.completion,
      } as UserSignupDataDto,
      'Signup successful',
      'CREATED'
    );

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unexpected failure';
    this.logger.error(`[AUTH SIGNUP CRASH] ${errorMessage}`);

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
): Promise<BaseResponseDto<OrganizationSignupDataDto>> {
  this.logger.log(`Starting Org Signup for: ${dto.name} [Plan: ${dto.planSlug || 'free'}]`);

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
      return BaseResponseDto.fail(
        'Invalid or expired verification code.', 
        'UNAUTHORIZED', 
        { code: 'INVALID_OTP' }
      );
    }

    const adminUserUuid = randomUUID();

    // 2. Prepare and Call Profile Service (gRPC)
    const createOrgProfileReq: CreateOrganisationRequestDto = {
      name: dto.name,
      officialEmail: dto.officialEmail,
      officialPhone: dto.officialPhone,
      physicalAddress: dto.physicalAddress,
      email: dto.email,
      phone: dto.phone,
      adminUserUuid: adminUserUuid,
      adminFirstName: dto.adminFirstName,
      adminLastName: dto.adminLastName,
      organizationType: dto.organizationType || 'PRIVATE_LIMITED',
      planSlug: dto.planSlug || 'free-plan',
    };

    const profileGrpcService = this.getProfileGrpcService();
    const orgResponse = await firstValueFrom(
      profileGrpcService.createOrganizationProfile(createOrgProfileReq),
    );

    // Properly capture Profile Service failures (duplicates, etc.)
    if (!orgResponse.success || !orgResponse.data) {
      return BaseResponseDto.fail(
        orgResponse.message || 'Organisation profile creation failed',
        orgResponse.code || 'INTERNAL_ERROR',
        orgResponse.error
      );
    }

    // 3. Save Admin Credentials Locally
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    await this.prisma.credential.create({
      data: {
        userUuid: adminUserUuid,
        email: dto.email,
        passwordHash: hashedPassword,
        mfaEnabled: true,
      },
    });

    // 4. CLEANUP
    await this.prisma.otp.deleteMany({
      where: { email: dto.email, purpose: 'SIGNUP' }
    });

    /* ======================================================
       5. PREMIUM BRANCH: PAYMENT HAND-OFF
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

        return BaseResponseDto.ok(
          {
            orgCode: orgResponse.data.orgCode,
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
            orgCode: orgResponse.data.orgCode,
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
       6. FREEMIUM BRANCH: ASYNC EVENT EMISSION
    ====================================================== */
    this.notificationBus.emit('organization.onboarded', {
      accountId: orgResponse.data.account.accountCode,
      name: dto.name,
      adminFirstName: orgResponse.data.admin.firstName,
      adminEmail: dto.email,
      orgEmail: dto.officialEmail,
      plan: 'Free Forever',
    });

    return BaseResponseDto.ok(
      {
        organization: {
          id: String(orgResponse.data.id),
          uuid: orgResponse.data.uuid,
          name: orgResponse.data.name,
          orgCode: orgResponse.data.orgCode,
          verificationStatus: orgResponse.data.verificationStatus,
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

    return BaseResponseDto.fail(message, 'INTERNAL_ERROR');
  }
}

  // ------------------ Unified Login ------------------
 async login(
  loginDto: LoginRequestDto,
): Promise<BaseResponseDto<LoginResponseDto>> {
  this.logger.debug(`Login Stage 1 (Password check) received for: ${loginDto.email}`);

  try {
    // 1. Validate Credentials & Fetch Profile via gRPC
    // validateUser handles lockout logic and password bcrypt comparison
    const profile = await this.validateUser(loginDto.email, loginDto.password);

    if (!profile) {
      throw new UnauthorizedException('Invalid credentials');
    }

    /* ======================================================
       2. TRIGGER MFA CHALLENGE (Always-On Default)
    ====================================================== */
    const otpPayload = {
      email: loginDto.email,
      purpose: '2FA', 
    };

    // Generates code, saves to DB, and emits to Notification Bus
    await this.requestOtp(otpPayload);

    this.logger.log(`[AUTH] Password verified. MFA Challenge sent to: ${loginDto.email}`);

    /* ======================================================
       3. CONSTRUCT INTERMEDIATE RESPONSE
    ====================================================== */
    // We return enough data for the frontend to show a personalized OTP screen
    // but NO tokens (accessToken/refreshToken) are issued yet.
    return {
      success: true,
      message: 'MFA_REQUIRED',
      code: '2FA_PENDING',
      data: {
        email: profile.user.email,
        firstName: profile.user.firstName,
        lastName: profile.user.lastName,
        uuid: profile.user.uuid,
        status: profile.user.status,
      } as unknown as LoginResponseDto,
      error: null,
    } as BaseResponseDto<LoginResponseDto>;


  } catch (err: unknown) {
    this.logger.error(`Login Stage 1 failed for ${loginDto.email}`, err instanceof Error ? err.stack : err);

    // 1. Handle Known Unauthorized (Lockouts, Wrong Passwords)
    if (err instanceof UnauthorizedException) {
      const errorMessage = err.message;
      return {
        success: false,
        message: errorMessage,
        code: 'UNAUTHORIZED',
        data: null as unknown as LoginResponseDto,
        error: { 
          code: 'AUTH_FAILURE', 
          message: errorMessage,
          details: (err as any).getResponse?.()?.message || null 
        },
      } as BaseResponseDto<LoginResponseDto>;
    }

    // 2. Handle gRPC Service Failures (Profile/RBAC)
    if (err instanceof RpcException || (err as any).code !== undefined) {
      const rpcErr = (err instanceof RpcException ? err.getError() : err) as any;
      return {
        success: false,
        message: 'Identity service communication failure',
        code: 'SERVICE_UNAVAILABLE',
        data: null as unknown as LoginResponseDto,
        error: { 
          code: String(rpcErr.code), 
          message: rpcErr.message,
          details: rpcErr.details || null
        },
      } as BaseResponseDto<LoginResponseDto>;
    }

    // 3. Fallback for Internal Errors
    return {
      success: false,
      message: 'Internal server error during login stage 1',
      code: 'INTERNAL',
      data: null as unknown as LoginResponseDto,
      error: { 
        code: 'INTERNAL', 
        message: err instanceof Error ? err.message : 'Login failed',
        details: null
      } ,
    } as BaseResponseDto<LoginResponseDto>;
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
  clientInfo?: Pick<SessionDto, 'device' | 'ipAddress' | 'userAgent' | 'os'>
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
        }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (profileErr) {
        // Truly brand new user
        isNewProvisioning = true;
        this.logger.log(`[Google Auth] New user detected: ${email}. Provisioning...`);
        
        const userUuid = randomUUID();

        // Fix for Unique Constraint: Ensure phone is null if not provided
        const createResponse = await firstValueFrom(
          profileGrpc.createUserProfile({
            userUuid,
            email,
            firstName: given_name || 'User',
            lastName: family_name || '',
            phone: null,
            planSlug: "free-forever"
          }),
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

        // Emit Onboarding Event (Welcome Email)
        this.notificationBus.emit('user.onboarded', {
          accountId: profileData.account.accountCode,
          firstName: profileData.user.firstName,
          email: profileData.user.email,
          plan: 'Free Forever',
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

      const loginEmailPayload: UserLoginEmailDto = {
        to: profileData.user.email,
        firstName: profileData.user.firstName || 'User',
        lastName: profileData.user.lastName || '',
        organizationName: isOrgAccount ? profileData.organization?.name : undefined,
        orgEmail: isUserAdmin ? profileData.organization?.officialEmail : undefined,
        subject: isUserAdmin
          ? `SECURITY: Admin Login to ${profileData.organization?.name}` 
          : 'New Login to Your Pivota Account (via Google)',
        device: clientInfo?.device || 'Unknown Device',
        os: clientInfo?.os || 'Unknown OS',
        userAgent: clientInfo?.userAgent || 'Unknown Browser',
        ipAddress: clientInfo?.ipAddress || '0.0.0.0',
        timestamp: new Date().toISOString(),
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
  const profileResponse = await firstValueFrom(
    userGrpcService.getUserProfileByUuid({ userUuid: userUuid })
  );   
  
  const userData = profileResponse.data.user;
  const accountData = profileResponse.data.account;
  const organizationUuid = profileResponse.data.organization.uuid
  const fullName = `${userData.firstName} ${userData.lastName}`.trim();

  try {
    // 1. Pre-generate the Dev Token ID
    const devTokenId = `dev-${userUuid}-${Date.now()}`;

    // 2. Prepare Payload including the tokenId
    const payload: JwtPayload = {
      userUuid,
      email,
      role,
      accountId,
      organizationUuid,
      tokenId: devTokenId, // Linked to the DB entry below
      userName: fullName,
      accountName: accountData.type === 'ORGANIZATION' ? profileResponse.data.organization.name : fullName,
      accountType: accountData.type
    };

    // 3. Sign Tokens
    const accessToken = await this.jwtService.signAsync(payload, { expiresIn: '1h' });
    const refreshToken = await this.jwtService.signAsync(payload, { expiresIn: '7d' });

    // 4. Cleanup old Dev sessions to keep DB clean
    await this.prisma.session.deleteMany({
      where: {
        userUuid: userUuid,
        device: 'Postman-Dev', 
      },
    });

    // 5. Create the fresh session in DB
    await this.prisma.session.create({
      data: {
        userUuid,
        tokenId: devTokenId, // MUST match payload.tokenId
        hashedToken: await bcrypt.hash(refreshToken, 10),
        device: 'Postman-Dev',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revoked: false,
        lastActiveAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Dev tokens generated successfully',
      code: 'OK',
      data: { accessToken, refreshToken }, // Ensuring it wraps in 'data' for BaseResponseDto consistency
    } as BaseResponseDto<TokenPairDto>;

  } catch (err: unknown) {
    const unknownErr = err as Error;
    this.logger.error(`Dev Token Error: ${unknownErr.message}`);
    return BaseResponseDto.fail(unknownErr?.message || 'Dev token generation failed', 'INTERNAL');
  }
}

/** ------------------ Request OTP ------------------ */
async requestOtp(data: RequestOtpDto & { purpose: string }): Promise<BaseResponseDto<null>> {
  const { email, purpose } = data;

  try {
    // 1. Check if user already exists
    const existingUser = await this.prisma.credential.findUnique({
      where: { email },
      select: { id: true }, 
    });

    // 2. Business Logic based on Purpose
    // 2. Business Logic based on Purpose
    switch (purpose) {
      case 'SIGNUP':
      case 'ORGANIZATION_SIGNUP': // Added to support your organization onboarding
        if (existingUser) {
          this.logger.warn(`[OTP] ${purpose} blocked: ${email} already exists.`);
          return BaseResponseDto.fail('This email is already registered.', 'CONFLICT');
        }
        break;

      case 'PASSWORD_RESET':
        if (!existingUser) {
          // Masking response to prevent account enumeration
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
        this.logger.error(`[OTP] Unsupported purpose received: ${purpose}`);
        return BaseResponseDto.fail('Invalid request purpose.', 'BAD_REQUEST');
    }

    /* ---------- UPDATED: ALLOW 3 ATTEMPTS PER MINUTE ---------- */
    const oneMinuteAgo = new Date(Date.now() - 60000);

    // Count how many OTPs were sent to this email for this purpose in the last 60 seconds
    const otpCount = await this.prisma.otp.count({
      where: { 
        email, 
        purpose,
        createdAt: { gte: oneMinuteAgo } 
      },
    });

    // If we have 3 records created in the last 60s, block the 4th attempt
    if (otpCount >= 3) {
  
      this.logger.warn(`[OTP] Rate limited: ${email} reached 3 attempts limit.`);
      
      return BaseResponseDto.fail(
        'Maximum verification attempts reached. Please try again later.',
        'TOO_MANY_REQUESTS'
      );
    }
    
    /* --------------------------------------------------------- */
   
    // 3. Generate 6-digit code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const EXPIRES_IN_MINUTES = 10;
    
    // FIX: Explicitly create a UTC timestamp
    const now = new Date();
    const expiresAt = new Date(now.getTime() + EXPIRES_IN_MINUTES * 60000);

    // 4. Save to DB 
    // We clean up records that are physically older than 10 minutes from 'now'
    const expiryThreshold = new Date(now.getTime() - 10 * 60000);

    await this.prisma.otp.deleteMany({ 
      where: { 
        email, 
        purpose,
        // Only delete strictly expired ones, keeping recent attempts for rate limiting
        createdAt: { lt: expiryThreshold }
      } 
    });

    await this.prisma.otp.create({
      data: {
        email,
        code: otpCode,
        purpose,
        expiresAt, // Prisma will handle the conversion to UTC ISO string
      },
    });

    // 5. Emit Event to Notification Service
    this.logger.log(`[RMQ Outbound] Emitting otp.requested for ${email} (${purpose})`);

    const otpPayload: SendOtpEventDto = {
      email,
      code: otpCode,
      purpose,
    };
    this.notificationBus.emit('otp.requested', otpPayload);

    return BaseResponseDto.ok(null, 'Verification code sent to your email');

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Failed to generate OTP for ${email}`, message);
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
     * Cleanup: Delete all OTPs for this email and purpose to prevent replay attacks.
     * We keep OTPs for other purposes intact to avoid disrupting concurrent flows.
     */
    await this.prisma.otp.deleteMany({
      where: { 
        email, 
        purpose 
      },
    });

    this.logger.log(`[AUTH] OTP verified successfully: ${email} [${purpose}]`);

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
  clientInfo?: Pick<SessionDto, 'device' | 'ipAddress' | 'userAgent' | 'os'>,
): Promise<BaseResponseDto<LoginResponseDto>> {
  this.logger.debug(`Login Stage 2 (MFA) received for: ${verifyDto.email}`);

  try {
    // 1. Verify OTP in Database
    const validOtp = await this.prisma.otp.findFirst({
      where: {
        email: verifyDto.email,
        code: verifyDto.code,
        purpose: '2FA',
        expiresAt: { gt: new Date() },
      },
    });

    if (!validOtp) {
      return BaseResponseDto.fail(
        'Invalid or expired 2FA code',
        'INVALID_OTP',
        { email: verifyDto.email }
      );
    }

    // 2. Fetch User Profile to generate tokens
    const credential = await this.prisma.credential.findUnique({
      where: { email: verifyDto.email },
    });

    if (!credential) {
      return BaseResponseDto.fail(
        'User account not found',
        'USER_NOT_FOUND',
        { email: verifyDto.email }
      );
    }

    let profileResponse;
    try {
      profileResponse = await firstValueFrom(
        this.getProfileGrpcService().getUserProfileByUuid({ userUuid: credential.userUuid })
      );
    } catch (grpcError) {
      this.logger.error(`gRPC error fetching profile: ${grpcError.message}`);
      return BaseResponseDto.fail(
        'Profile service unavailable',
        'SERVICE_UNAVAILABLE',
        { userUuid: credential.userUuid }
      );
    }

    if (!profileResponse?.success || !profileResponse.data) {
      return BaseResponseDto.fail(
        'User profile not found',
        'USER_NOT_FOUND',
        { userUuid: credential.userUuid }
      );
    }

    const profile = profileResponse.data;
    const userData = profile.user;

    // Check user status
    if (userData.status !== 'ACTIVE') {
      return BaseResponseDto.fail(
        `Your account is ${userData.status.toLowerCase()}`,
        'ACCOUNT_INACTIVE',
        { status: userData.status }
      );
    }

    // 3. Generate JWT Tokens & Create Session
    const { accessToken, refreshToken } = await this.generateTokens(profile, clientInfo);

    /* ======================================================
       4. NOTIFICATION LOGIC
    ====================================================== */
    const adminRoles = ['Business System Admin'];
    const isOrgAccount = profile.account.type === 'ORGANIZATION';
    const isUserAdmin = isOrgAccount && adminRoles.includes(userData.roleName);

    const loginEmailPayload: UserLoginEmailDto = {
      to: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      organizationName: isOrgAccount ? profile.organization?.name : undefined,
      orgEmail: isUserAdmin ? profile.organization?.officialEmail : undefined,
      subject: isUserAdmin ? `SECURITY: Admin Login` : 'New Login detected',
      device: clientInfo?.device || 'Unknown',
      os: clientInfo?.os || 'Unknown',
      userAgent: clientInfo?.userAgent || 'Unknown',
      ipAddress: clientInfo?.ipAddress || '0.0.0.0',
      timestamp: new Date().toISOString(),
    };

    this.notificationBus.emit('user.login.email', loginEmailPayload);

    // 5. Cleanup: Burn the OTP
    await this.prisma.otp.delete({ where: { id: validOtp.id } });

    // 6. Final Login Response
    return BaseResponseDto.ok(
      {
        id: userData.uuid,
        uuid: userData.uuid,
        userCode: userData.userCode,
        accountId: profile.account.uuid,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        status: userData.status,
        role: userData.roleName,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
        accessToken,
        refreshToken,
        organization: profile.organization ? {
          uuid: profile.organization.uuid,
          name: profile.organization.name,
          orgCode: profile.organization.orgCode,
          verificationStatus: profile.organization.verificationStatus,
        } : undefined,
      } as unknown as LoginResponseDto,
      'Login successful',
      'OK'
    );

  } catch (err: unknown) {
    this.logger.error(`MFA Verification failed for ${verifyDto.email}:`, err);
    
    // Fallback error for unexpected errors
    return BaseResponseDto.fail(
      'An unexpected error occurred during login',
      'INTERNAL_ERROR',
      { error: err instanceof Error ? err.message : 'Unknown error' }
    );
  }
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
    // 1. Reuse your existing verifyOtp logic
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
      // Note: We call it to invalidate all active devices/refresh tokens
      await this.revokeSessions(updatedCredential.userUuid);

      // 4. Delete the OTP now that it has been used
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