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
  UserOnboardedEventDto,
  OrganizationOnboardedEventDto,
  UserProfileResponseDto,
} from '@pivota-api/dtos';
import { firstValueFrom, Observable } from 'rxjs';
import { BaseGetUserRoleReponseGrpc, JwtPayload } from '@pivota-api/interfaces';
import { randomUUID } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import * as dotenv from 'dotenv';

dotenv.config({ path: `.env.${process.env.NODE_ENV || 'dev'}` });

interface GrpcError {
  code: number | string;
  message: string;
  details?: unknown;
}

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
  
  // gRPC Clients
  @Inject('PROFILE_GRPC') private readonly grpcClient: ClientGrpc,
  @Inject('RBAC_PACKAGE') private readonly rbacClient: ClientGrpc,

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

  

  // ------------------ Validate User ------------------
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

  // ------------------ Generate Tokens ------------------
  /** ------------------ Generate Tokens ------------------ */
  async generateTokens(
    profile: UserProfileResponseDto,
    clientInfo?: Pick<SessionDto, 'device' | 'ipAddress' | 'userAgent' | 'os'>,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const userData = profile.user;
    const accountData = profile.account;
    const fullName = `${userData.firstName} ${userData.lastName}`.trim();
    // 1. Fetch the User Role via gRPC (RBAC Service)
    const rbacService = this.getRbacGrpcService();
    const userRoleResponse = await firstValueFrom(
      rbacService.getUserRole({ userUuid: userData.uuid }),
    );
    
    // Fallback to GeneralUser if no role is found
    const roleType = userRoleResponse?.role?.roleType ?? 'GeneralUser';
    

    // 2. Prepare JWT Payload
    const payload: JwtPayload = {
      userUuid: userData.uuid,
      email: userData.email,
      role: roleType,
      accountId: accountData.uuid,
      userName: fullName,
      accountName: accountData.type == 'ORGANIZATION' ? profile.organization.name :  fullName,
      accountType: accountData.type as 'INDIVIDUAL' | 'ORGANIZATION'
    };

    // 3. Sign Access and Refresh Tokens
    const accessToken = await this.jwtService.signAsync(payload, { expiresIn: '15m' });
    const refreshToken = await this.jwtService.signAsync(payload, { expiresIn: '7d' });

    // 4. Security: Hash the Refresh Token before storing it in DB
    const hashedToken = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // 5. CREATE SESSION (Detailed Activity Tracking)
    // This follows your new schema by capturing environmental context
    await this.prisma.session.create({
      data: {
        userUuid: userData.uuid,
        tokenId: `${payload.userUuid}-${Date.now()}`,
        hashedToken,
        
        // Contextual Metadata from clientInfo
        device: clientInfo?.device,
        ipAddress: clientInfo?.ipAddress,
        userAgent: clientInfo?.userAgent,
        os: clientInfo?.os,
        
        // Activity Tracking
        lastActiveAt: new Date(), // Set current time as the first activity
        expiresAt,
        revoked: false,
      },
    });

    this.logger.debug(`[AUTH] New session created for User: ${userData.uuid} on ${clientInfo?.device || 'unknown device'}`);

    return { accessToken, refreshToken };
  }

  /* ======================================================
   INDIVIDUAL SIGNUP (Auth Service)
====================================================== */
async signup(signupDto: UserSignupRequestDto): Promise<BaseResponseDto<UserSignupDataDto>> {
  const profileGrpcService = this.getProfileGrpcService();

  // 1. Anchor Identity: Pre-generate the UUID
  const userUuid = randomUUID();

  try {
    // 2. Call Profile Service (gRPC) to create the identity records
    const profileResponse = await firstValueFrom(
      profileGrpcService.createUserProfile({
        userUuid: userUuid,
        email: signupDto.email,
        firstName: signupDto.firstName,
        lastName: signupDto.lastName,
        phone: signupDto.phone,
      }),
    );

    this.logger.debug(`Profile Service Response: ${JSON.stringify(profileResponse)}`);

    // Strict check for success and data presence
    if (!profileResponse.success || !profileResponse.data) {
      return {
        success: false,
        message: profileResponse.message || 'User profile creation failed',
        code: profileResponse.code || 'INTERNAL',
        error: profileResponse.error,
        data: null as unknown as UserSignupDataDto,
      };
    }

    // 3. Save Credentials locally in Auth DB
    // We do this only after the Profile Service confirms the user exists
    const hashedPassword = await bcrypt.hash(signupDto.password, 10);
    await this.prisma.credential.create({
      data: { 
        userUuid: userUuid, 
        passwordHash: hashedPassword, 
        email: signupDto.email 
      },
    });

    this.logger.log(`Auth credentials anchored to User UUID: ${userUuid}`);

    /* ======================================================
       4. ASYNC EVENT EMISSION (The "Double Emit")
       Both DBs are confirmed. Trigger background provisioning.
    ====================================================== */
    const onboardedPayload: UserOnboardedEventDto = {
        accountId: profileResponse.data.account.accountCode,
        firstName: signupDto.firstName,
        email: signupDto.email,
        // Focus only on the Plan and Billing for the Free Tier
        plan: 'Free Forever',        
      };
      this.logger.log(`[RMQ Outbound] Emitting user.onboarded for ${profileResponse.data.user.firstName}`);

    // Emit to Notification Service (Queue: notification_email_queue)
    // For the Welcome Email
    this.notificationBus.emit('user.onboarded', onboardedPayload);

    this.logger.log(`✅ Onboarding events dispatched for: ${signupDto.email}`);

    /* ======================================================
       5. RETURN SUCCESS
    ====================================================== */
    return {
      success: true,
      message: 'Signup successful',
      code: 'CREATED',
      data: {
        account: profileResponse.data.account,
        user: profileResponse.data.user,
        profile: profileResponse.data.profile,
        completion: profileResponse.data.completion
      },
      error: null,
    };
    
  } catch (err: unknown) {
    this.logger.error('Individual Signup Error', err);
    
    // Type-safe Error Handling for gRPC
    if (err instanceof RpcException) {
      const rpcErr = err.getError() as unknown as GrpcError;
      return {
        success: false,
        message: rpcErr.message || 'Communication failure with Profile Service',
        code: String(rpcErr.code) || 'GRPC_ERROR',
        error: {
          code: String(rpcErr.code),
          message: rpcErr.message,
        },
        data: null as unknown as UserSignupDataDto,
      };
    }

    const internalErr = err instanceof Error ? err : new Error('Unknown Auth Error');
    return {
      success: false,
      message: internalErr.message,
      code: 'INTERNAL',
      error: { code: 'INTERNAL', message: internalErr.message },
      data: null as unknown as UserSignupDataDto,
    };
  }
}


  // ------------------ Organisation Signup ------------------
async organisationSignup(
  dto: OrganisationSignupRequestDto,
): Promise<BaseResponseDto<OrganizationSignupDataDto>> {
  this.logger.log(`Starting Org Signup for: ${dto.name}`);

  const adminUserUuid = randomUUID();

  try {
    // 1. Prepare and Call Profile Service (gRPC)
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
    };

    const profileGrpcService = this.getProfileGrpcService();
    const orgResponse = await firstValueFrom(
      profileGrpcService.createOrganizationProfile(createOrgProfileReq),
    );

    if (!orgResponse.success || !orgResponse.data) {
      return {
        success: false,
        code: orgResponse.code || 'INTERNAL',
        message: orgResponse.message || 'Organisation profile creation failed',
        error: orgResponse.error,
      };
    }

    // 2. Save Admin Credentials Locally
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    await this.prisma.credential.create({
      data: {
        userUuid: adminUserUuid,
        email: dto.email,
        passwordHash: hashedPassword,
      },
    });

    this.logger.log(`Org Signup Credentials stored for: ${adminUserUuid}`);
 
    /* ======================================================
   3. ASYNC EVENT EMISSION (Organization)
====================================================== */
const orgOnboardedPayload: OrganizationOnboardedEventDto = {
  accountId: orgResponse.data.account.accountCode, // String, not UUID
  name: dto.name,                                  // Business Name
  adminFirstName: orgResponse.data.admin.firstName,
  adminEmail: dto.email,                           // Admin's email (from DTO)
  orgEmail: dto.officialEmail,                     // Org official email
  plan: 'Free Forever',                            // Matches @IsOptional() @IsString()
};

// Emit the event
this.notificationBus.emit('organization.onboarded', orgOnboardedPayload);

this.logger.log(`✅ Organization onboarding events dispatched for: ${dto.name}`);

    // 4. Return the "Trio" shape
    return {
      success: true,
      code: 'CREATED',
      message: 'Organization and Admin User created successfully',
      data: {
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
      },
      error: null
    };

  } catch (err: any) {
    this.logger.error('Organisation Signup Error', err);
    return {
      success: false,
      message: err.message || 'Internal Auth Error during Org Signup',
      code: 'INTERNAL',
      error: { 
        code: err.constructor.name === 'RpcException' ? 'GRPC_ERROR' : 'INTERNAL', 
        message: err.message 
      },
    };
  }
}

  // ------------------ Unified Login ------------------
 async login(
  loginDto: LoginRequestDto,
  clientInfo?: Pick<SessionDto, 'device' | 'ipAddress' | 'userAgent' | 'os'>,
): Promise<BaseResponseDto<LoginResponseDto>> {
  this.logger.debug(`Login request received for: ${loginDto.email}`);

  try {
    // 1. Validate Credentials & Fetch Profile via gRPC
    // The profile returned here already contains the user, account, and organization data
    const profile = await this.validateUser(loginDto.email, loginDto.password);

    if (!profile) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Helper variables
    const userData = profile.user;
    const accountData = profile.account;
    const isOrgAccount = accountData.type === 'ORGANIZATION';
   

    // 2. Generate JWT Tokens
    // roleName is passed here to be signed into the JWT payload as the source of truth
    const { accessToken, refreshToken } = await this.generateTokens(
      profile,
      clientInfo,
    );

  /* ======================================================
   3. CONDITIONAL NOTIFICATION LOGIC
====================================================== */

// 1. Define what qualifies as an 'Admin' login for your business logic
const adminRoles = ['Business System Admin'];

// LOG 1: Check the raw data coming from the Profile Service
this.logger.debug(`[Login Debug] User Role: "${userData.roleName}" | Is Org: ${isOrgAccount}`);
this.logger.debug(`[Login Debug] Org Official Email: "${profile.organization?.officialEmail}"`);

const isUserAdmin = isOrgAccount && adminRoles.includes(userData.roleName);

// LOG 2: Check if the Admin condition was actually met
this.logger.debug(`[Login Debug] Is User Admin Match: ${isUserAdmin}`);

const loginEmailPayload: UserLoginEmailDto = {
  to: userData.email,
  firstName: userData.firstName || 'User',
  lastName: userData.lastName || 'User',
  organizationName: isOrgAccount ? profile.organization?.name : undefined,

  // FIX: Only provide orgEmail if the user logging in IS an admin.
  orgEmail: isUserAdmin ? profile.organization?.officialEmail : undefined,

  subject: isUserAdmin
    ? `SECURITY: Admin Login to ${profile.organization?.name}` 
    : 'New Login to Your Pivota Account',

  device: clientInfo?.device || 'Unknown Device',
  os: clientInfo?.os || 'Unknown OS',
  userAgent: clientInfo?.userAgent || 'Unknown Browser',
  ipAddress: clientInfo?.ipAddress || '0.0.0.0',
  timestamp: new Date().toISOString(),
};

// LOG 3: Final confirmation of the payload before it leaves the service
this.logger.log(`[RMQ Emit] Sending login email event for: ${loginEmailPayload.to}`);
if (loginEmailPayload.orgEmail) {
  this.logger.log(`[RMQ Emit] Target secondary Org Email detected: ${loginEmailPayload.orgEmail}`);
} else {
  this.logger.warn(`[RMQ Emit] No secondary Org Email set. IsAdmin was ${isUserAdmin}`);
}


// Dispatch to background queue
this.notificationBus.emit('user.login.email', loginEmailPayload);

    /* ======================================================
       4. CONSTRUCT RESPONSE
    ====================================================== */
    const loginData: LoginResponseDto = {
      id: userData.uuid,
      uuid: userData.uuid,
      userCode: userData.userCode,
      accountId: accountData.uuid,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      phone: userData.phone,
      status: userData.status,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,

      accessToken,
      refreshToken,

      // Map organization details if it's an organization account
      organization: profile.organization ? {
        uuid: profile.organization.uuid,
        name: profile.organization.name,
        orgCode: profile.organization.orgCode,
        verificationStatus: profile.organization.verificationStatus,
      } : undefined
    };

  
    return {
      success: true,
      message: 'Login successful',
      code: 'OK',
      data: loginData,
      error: null,
    };

  } catch (err: unknown) {
    this.logger.error(`Login failed for ${loginDto.email}`, err instanceof Error ? err.stack : err);

    if (err instanceof UnauthorizedException) {
      // Extract the message (e.g., "Invalid credentials" or "Account locked. Try again in 15 minutes.")
      const errorMessage = err.message;
      
      return {
        success: false,
        message: errorMessage,
        code: 'UNAUTHORIZED',
        data: null as unknown as LoginResponseDto,
        error: { 
          code: 'AUTH_FAILURE', 
          message: errorMessage,
          // We add details here if you want to pass more structured info to the frontend
          details: (err as any).getResponse?.()?.message || null 
        },
      };
    }

    // Handle gRPC errors if ProfileService or RBAC fails during login
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
      };
    }
    

    return {
      success: false,
      message: 'Internal server error during login',
      code: 'INTERNAL',
      data: null as unknown as LoginResponseDto,
      error: { 
        code: 'INTERNAL', 
        message: err instanceof Error ? err.message : 'Login failed',
        details: null
      },
    };
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
      };

    } catch (err: unknown) {
      this.logger.error(`[AUTH] Refresh Token Error: ${err instanceof Error ? err.message : 'Unknown'}`);
      
      if (err instanceof UnauthorizedException) {
        return {
          success: false,
          message: err.message,
          code: 'UNAUTHORIZED',
          data: null as any,
          error: { code: 'AUTH_FAILURE', message: err.message }
        };
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
      };
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
            phone: null, // Best practice: send null, not empty string ""
          }),
        );

        if (!createResponse.success || !createResponse.data) {
          throw new Error('Profile creation failed via gRPC');
        }

        await this.prisma.credential.create({
          data: { userUuid, email, googleProviderId, passwordHash: null },
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
    };

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
async generateDevToken(userUuid: string, email: string, role: string, accountId: string): Promise<BaseResponseDto<TokenPairDto>> {

  const userGrpcService = this.getProfileGrpcService();
  const profileResponse = await firstValueFrom(
  userGrpcService.getUserProfileByUuid({ userUuid: userUuid })
  );   
  const userData = profileResponse.data.user
  const accountData = profileResponse.data.account
  const fullName = `${userData.firstName} ${userData.lastName}`.trim()
  try {
    const payload: JwtPayload = {
      userUuid,
      email,
      role,
      accountId,
      userName: fullName,
      accountName: accountData.type=='ORGANIZATION' ? profileResponse.data.organization.name : fullName,
      accountType: accountData.type
    };

    const accessToken = await this.jwtService.signAsync(payload, { expiresIn: '1h' });
    const refreshToken = await this.jwtService.signAsync(payload, { expiresIn: '7d' });

    /**
     *  PREVENTION: CLEANUP BEFORE CREATE
     * We delete any previous dev sessions for THIS specific user/role 
     * before creating a new one. This keeps the DB at a constant size.
     */
    await this.prisma.session.deleteMany({
      where: {
        userUuid: userUuid,
        device: 'Postman-Dev', // Only targets sessions created by this tool
      },
    });

    // Create the fresh session
    await this.prisma.session.create({
      data: {
        userUuid,
        tokenId: `dev-${userUuid}-${Date.now()}`,
        hashedToken: await bcrypt.hash(refreshToken, 10),
        device: 'Postman-Dev',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const success= {
      success: true,
      message: 'Dev tokens generated successfully',
      code: 'OK',
      tokens: { accessToken, refreshToken }, // Use 'data' if that matches your DTO
      error: null,
    };

    return success;

  } catch (err: unknown) {
    const unknownErr = err as Error;
    this.logger.error(`Dev Token Error: ${unknownErr.message}`);
    return {
      success: false,
      message: 'Dev token generation failed',
      code: 'INTERNAL',
      error: { 
        code: 'INTERNAL', 
        message: unknownErr?.message || 'Internal Server Error' 
      },
    };
  }
}
}