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



  getUserProfileByEmail(data: { email: string }): Observable<BaseUserResponseGrpc<UserResponseDto> | null>;

  getUserProfileByUuid(data: GetUserByUserUuidDto): Observable<BaseUserResponseGrpc<UserResponseDto> | null>;
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
    @Inject('PROFILE_GRPC') private readonly grpcClient: ClientGrpc,
    @Inject('PROFILE_RMQ') private readonly rabbitClient: ClientProxy,
    @Inject('RBAC_PACKAGE') private readonly rbacClient: ClientGrpc,
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
  async validateUser(email: string, password: string): Promise<UserResponseDto | null> {
    try {
      const profileGrpcService = this.getProfileGrpcService();
      const userProfileGrpcResponse: BaseUserResponseGrpc<UserResponseDto> | null =
        await firstValueFrom(profileGrpcService.getUserProfileByEmail({ email }));

        this.logger.debug(`Profile Response: ${JSON.stringify(userProfileGrpcResponse)}`)


      if (!userProfileGrpcResponse?.success || !userProfileGrpcResponse.user) return null;

      const userProfile = userProfileGrpcResponse.user;

      this.logger.debug(`Profile Response: ${JSON.stringify(userProfile)}`)

      const credential = await this.prisma.credential.findUnique({
        where: { userUuid: userProfile.uuid },
      });

      this.logger.debug(`Credential Response: ${JSON.stringify(credential)}`)

      if (!credential) return null;

      const isValid = await bcrypt.compare(password, credential.passwordHash);
      if (!isValid) return null;


      return userProfile;
    } catch (err: unknown) {
      this.logger.error('Error validating user', err);
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
    // 2. Call Profile Service (gRPC) using CreateUserRequestDto
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
        data: null as unknown as UserSignupDataDto, // Type safety for BaseResponseDto
      };
    }

    // 3. Save Credentials locally in Auth DB
    const hashedPassword = await bcrypt.hash(signupDto.password, 10);
    await this.prisma.credential.create({
      data: { 
        userUuid: userUuid, 
        passwordHash: hashedPassword, 
        email: signupDto.email 
      },
    });

    this.logger.log(`Auth credentials anchored to User UUID: ${userUuid}`);

    // 4. Return Success with the UserSignupDataDto (The Trio: User + Account)
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
    
    // Type-safe Error Handling
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

    // 1. Pre-generate the Admin User UUID to anchor the identity
    const adminUserUuid = randomUUID();

    try {
      /* 2. Map to the Internal Request DTO
         Now including the official contact details and admin phone.
      */
      const createOrgProfileReq: CreateOrganisationRequestDto = {
        // Business Info
        name: dto.name,
        officialEmail: dto.officialEmail,
        officialPhone: dto.officialPhone,
        physicalAddress: dto.physicalAddress,
        
        // Admin Profile Info
        email: dto.email,
        phone: dto.phone,
        adminUserUuid: adminUserUuid,
        adminFirstName: dto.adminFirstName,
        adminLastName: dto.adminLastName,
      };

      /* 3. Call Organisation Service (gRPC) */
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

      /* 4. Save Credentials Locally 
         We include the email here so the Auth Service can perform 
         logins without calling the Profile service.
      */
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      
      await this.prisma.credential.create({
        data: {
          userUuid: adminUserUuid, 
          email: dto.email, // Added to the Auth schema as per earlier discussion
          passwordHash: hashedPassword,
        },
      });

      this.logger.log(`Org Signup Credentials stored for: ${adminUserUuid}`);

      /* 5. Return the "Trio" shape 
         Ensure the response mapping includes the data returned by Profile Service.
      */
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
  async login(
    loginDto: LoginRequestDto,
    clientInfo?: Pick<SessionDto, 'device' | 'ipAddress' | 'userAgent' | 'os'>,
  ): Promise<BaseResponseDto<LoginResponseDto>> {
    this.logger.debug(`Login request received: ${JSON.stringify(loginDto)}`)
    this.logger.debug(`Client Info: ${JSON.stringify(clientInfo)}`)


    try {
      const user = await this.validateUser(loginDto.email, loginDto.password);
      this.logger.debug(`Validated user: ${JSON.stringify(user)}`)

      if (!user) throw new UnauthorizedException('Invalid credentials');


      const { accessToken, refreshToken } = await this.generateTokens(
        {
          uuid: user.uuid,
          email: user.email,
          accountId: user.accountId
        },
        clientInfo,
      );

      const payload = {
        to: user.email,
        firstName: user.firstName,
        device: clientInfo?.device || 'Unknown device',
        ipAddress: clientInfo?.ipAddress || 'Unknown IP',
        userAgent: clientInfo?.userAgent || 'Unknown agent',
        os: clientInfo?.os || 'Unknown OS',
        timestamp: new Date().toISOString(),
      };
      this.rabbitClient.emit('user.login.email', payload);

      const login_success = {

        success: true,
        message: 'Login successful',
        code: 'OK',
        user: { ...user, accessToken, refreshToken },
        error: null,


      }

      return login_success;
    } catch (err: unknown) {
      const unknownErr = err as Error;

      const failure = {
        success: false,
        message: 'Login failed',
        code: 'INTERNAL',
        user: null,
        error: { code: 'INTERNAL', message: unknownErr?.message || 'Login failed' },
      }
      return failure;
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