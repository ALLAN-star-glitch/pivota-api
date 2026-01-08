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
  UserResponseDto,
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
import { BaseUserResponseGrpc, BaseGetUserRoleReponseGrpc, JwtPayload } from '@pivota-api/interfaces';
import { randomUUID } from 'crypto';

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
 async validateUser(email: string, password: string): Promise<UserProfileResponseDto | null> {
  const MAX_FAILED_ATTEMPTS = 5;
  const LOCKOUT_DURATION_MINUTES = 15;

  try {
    // 1. FETCH CREDENTIAL
    const credential = await this.prisma.credential.findUnique({
      where: { email },
    });

    if (credential) {
      this.logger.debug(`[AUTH] Found Credential for: ${email}. UUID in DB: ${credential.userUuid}`);
    } else {
      this.logger.warn(`[AUTH] Login attempt failed: ${email} not found.`);
      return null;
    }

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
        this.logger.error(`[AUTH] Locking account: ${email}`);
      }

      await this.prisma.credential.update({
        where: { id: credential.id },
        data: { failedAttempts: newFailedAttempts, lockoutExpires },
      });
      return null;
    }

    // 4. FETCH PROFILE
    const profileGrpcService = this.getProfileGrpcService();
    const grpcPayload = { userUuid: credential.userUuid };
    
    this.logger.debug(`[gRPC OUTBOUND] Calling ProfileService.getUserProfileByUuid with: ${JSON.stringify(grpcPayload)}`);

    const profileResponse = await firstValueFrom(
      profileGrpcService.getUserProfileByUuid(grpcPayload)
    );

    this.logger.debug(`[gRPC INBOUND] ProfileService Response received`);

    // Verify the response contains the full data object
    if (!profileResponse?.success || !profileResponse.data) {
      this.logger.error(
        `[SYNC ERROR] Profile missing in Profile Service for UUID: ${credential.userUuid}`
      );
      return null;
    }

    // Extract the full aggregate and the specific user record for status checks
    const fullProfileDto = profileResponse.data;
    const userDetails = fullProfileDto.user;

    // 5. CHECK USER STATUS
    if (userDetails.status !== 'ACTIVE') {
      this.logger.warn(`[AUTH] Blocked: User ${email} is ${userDetails.status}`);
      // Use toLowerCase() safely on the validated status string
      const statusMessage = userDetails.status ? userDetails.status.toLowerCase() : 'inactive';
      throw new UnauthorizedException(`Your account is ${statusMessage}.`);
    }

    // 6. FINAL SUCCESS: RESET & AUDIT
    await this.prisma.credential.update({
      where: { id: credential.id },
      data: { 
        lastLoginAt: new Date(),
        failedAttempts: 0,
        lockoutExpires: null 
      }
    });

    this.logger.log(`[AUTH] Validation successful for: ${email}`);
    
    // RETURN the full DTO (contains account, user, createdAt, updatedAt)
    return fullProfileDto;

  } catch (err: unknown) {
    if (err instanceof UnauthorizedException) throw err;
    
    this.logger.error('[AUTH] Error in validateUser flow');
    if (err instanceof Error) {
      this.logger.error(`[DETAILS] ${err.message}`);
    }
    return null;
  }
}

  // ------------------ Generate Tokens ------------------
  async generateTokens(
    user: { uuid: string; email: string, accountId: string },
    clientInfo?: Pick<SessionDto, 'device' | 'ipAddress' | 'userAgent' | 'os'>,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const rbacService = this.getRbacGrpcService();
    const userRoleResponse = await firstValueFrom(
      rbacService.getUserRole({ userUuid: user.uuid }),
    );
    const roleType = userRoleResponse?.role?.roleType ?? 'GeneralUser';

    const payload: JwtPayload = {
      userUuid: user.uuid,
      email: user.email,
       role: roleType,
      accountId: user.accountId
    };
    const accessToken = await this.jwtService.signAsync(payload, { expiresIn: '15m' });
    const refreshToken = await this.jwtService.signAsync(payload, { expiresIn: '7d' });

    const hashedToken = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.session.create({
      data: {
        userUuid: user.uuid,
        tokenId: `${payload.userUuid}-${Date.now()}`,
        hashedToken,
        device: clientInfo?.device,
        ipAddress: clientInfo?.ipAddress,
        userAgent: clientInfo?.userAgent,
        os: clientInfo?.os,
        expiresAt,
      },
    });

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // ------------------ Login ------------------
  // ------------------ Unified Login ------------------
 async login(
  loginDto: LoginRequestDto,
  clientInfo?: Pick<SessionDto, 'device' | 'ipAddress' | 'userAgent' | 'os'>,
): Promise<BaseResponseDto<LoginResponseDto>> {
  this.logger.debug(`Login request received for: ${loginDto.email}`);

  try {
    // 1. Validate Credentials & Fetch Profile via gRPC
    // 'user' is now the full UserProfileResponseDto
    const profile = await this.validateUser(loginDto.email, loginDto.password);

    if (!profile) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Shortcut variables for cleaner code
    const userData = profile.user;
    const accountData = profile.account;

    // 2. Generate JWT Tokens
    const { accessToken, refreshToken } = await this.generateTokens(
      {
        uuid: userData.uuid,
        email: userData.email,
        accountId: accountData.uuid
      },
      clientInfo,
    );

    // 3. Dispatch Security Notification (Async)      
    const loginEmailPayload: UserLoginEmailDto = {
      to: userData.email,
      firstName: userData.firstName || 'User',
      subject: profile.organization 
        ? `Security Alert: ${profile.organization.name} Admin Login` 
        : 'New Login to Your Pivota Account',
      device: clientInfo?.device || 'Unknown Device',
      os: clientInfo?.os || 'Unknown OS',
      userAgent: clientInfo?.userAgent || 'Unknown Browser',
      ipAddress: clientInfo?.ipAddress || '0.0.0.0',
      timestamp: new Date().toISOString(),
    };

    this.notificationBus.emit('user.login.email', loginEmailPayload);

    // 4. Construct the LoginResponseDto
    // We map strictly from the nested profile structure
    const loginData: LoginResponseDto = {
      // Identity Fields
      id: userData.uuid, // Using UUID as the ID for consistency
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

      // Auth Fields
      accessToken,
      refreshToken,

      // Organization Fields (if applicable)
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
      return {
        success: false,
        message: err.message,
        code: 'UNAUTHORIZED',
        data: null as unknown as LoginResponseDto,
        error: { code: 'AUTH_FAILURE', message: err.message },
      };
    }

    return {
      success: false,
      message: 'Internal server error during login',
      code: 'INTERNAL',
      data: null as unknown as LoginResponseDto,
      error: { code: 'INTERNAL', message: err instanceof Error ? err.message : 'Login failed' },
    };
  }
}

  // ------------------ Refresh Token ------------------
  async refreshToken(refreshToken: string): Promise<BaseResponseDto<TokenPairDto>> {
    if (!refreshToken) throw new UnauthorizedException('Refresh token is required');

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken);
      const userGrpcService = this.getProfileGrpcService();
      const user$ = userGrpcService.getUserProfileByUuid({ userUuid: payload.userUuid });
      const user: BaseUserResponseGrpc<UserResponseDto> = await firstValueFrom(user$);
      const sessions = await this.prisma.session.findMany({
        where: { userUuid: payload.userUuid, revoked: false },
      });
      const validSession = sessions.find((s) => bcrypt.compareSync(refreshToken, s.hashedToken));
      if (!validSession) throw new UnauthorizedException('Invalid or revoked refresh token');

      const tokens = await this.generateTokens({ uuid: user.user.uuid, email: user.user.email, accountId: user.user.accountId });

      const tokens_success = {

        success: true,
        message: 'Token generated successfully',
        code: 'OK',
        tokens,
        error: null,


      }

      return tokens_success;

    } catch (err: unknown) {
      const unknownErr = err as Error;
      return {
        success: false,
        message: 'Token refresh failed',
        code: 'INTERNAL',
        error: { code: 'INTERNAL', message: unknownErr?.message || 'Token refresh failed' },
      };
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
  try {
    const payload: JwtPayload = { 
      userUuid, 
      email, 
      role,
      accountId

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