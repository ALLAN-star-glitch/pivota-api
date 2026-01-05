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
  SignupRequestDto,
  LoginResponseDto,
  LoginRequestDto,
  SessionDto,
  TokenPairDto,
  UserResponseDto,
  BaseResponseDto,
  GetUserByUserUuidDto,
  RoleResponseDto,
} from '@pivota-api/dtos';
import { firstValueFrom, Observable } from 'rxjs';
import { BaseUserResponseGrpc, BaseGetUserRoleReponseGrpc, JwtPayload } from '@pivota-api/interfaces';


// ---------------- gRPC Interfaces ----------------
interface UserServiceGrpc {
  createUserProfile(data: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }): Observable<BaseUserResponseGrpc<UserResponseDto>>;

  getUserProfileByEmail(data: { email: string }): Observable<BaseUserResponseGrpc<UserResponseDto> | null>;

  getUserProfileByUuid(data: GetUserByUserUuidDto): Observable<BaseUserResponseGrpc<UserResponseDto> | null>;
}

interface RbacServiceGrpc {
  getUserRole(data: GetUserByUserUuidDto): Observable<BaseGetUserRoleReponseGrpc<RoleResponseDto> | null>;
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private userGrpcService: UserServiceGrpc;
  private rbacGrpcService: RbacServiceGrpc;


  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    @Inject('PROFILE_GRPC') private readonly grpcClient: ClientGrpc,
    @Inject('PROFILE_RMQ') private readonly rabbitClient: ClientProxy,
    @Inject('RBAC_PACKAGE') private readonly rbacClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.userGrpcService = this.grpcClient.getService<UserServiceGrpc>('ProfileService');
    this.logger.log('AuthService initialized (gRPC)');
    this.rbacGrpcService = this.rbacClient.getService<RbacServiceGrpc>('RbacService');
    this.logger.log('RbacService initialized (gRPC)');
  }

  private getGrpcService(): UserServiceGrpc {
    if (!this.userGrpcService) {
      this.userGrpcService = this.grpcClient.getService<UserServiceGrpc>('ProfileService');
    }
    return this.userGrpcService;
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
      const userGrpcService = this.getGrpcService();
      const userProfileGrpcResponse: BaseUserResponseGrpc<UserResponseDto> | null =
        await firstValueFrom(userGrpcService.getUserProfileByEmail({ email }));

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

  // ------------------ Signup ------------------
  async signup(signupDto: SignupRequestDto): Promise<BaseResponseDto<UserResponseDto>> {
    const userGrpcService = this.getGrpcService();

    try {

      // Call GRPC to create user profile 
      const userResponse = await firstValueFrom(
        userGrpcService.createUserProfile({
          email: signupDto.email,
          firstName: signupDto.firstName,
          lastName: signupDto.lastName,
          phone: signupDto.phone,
        }),
      );

      this.logger.debug(`Profile Response: ${JSON.stringify(userResponse)}`)

      if (!userResponse.success || !userResponse.user) {

        const user_profile_failure = {

          success: false,
          message: 'User profile creation failed',
          code: 'INTERNAL',
          user: null,
          error: { code: 'INTERNAL', message: 'User creation failed' },

        }
  
        return user_profile_failure;
      }

      const user = userResponse.user;

      const hashedPassword = await bcrypt.hash(signupDto.password, 10);
      await this.prisma.credential.create({
        data: { userUuid: user.uuid, passwordHash: hashedPassword },
      });

      //Credentials Created
      this.logger.log(`Credentials created for user ${user.uuid}`)
      this.logger.debug(`The credentials include: $userUuid: ${user.uuid}, passwordHash: ${hashedPassword} `)

      const user_signup_success = {

        success: true,
        message: 'Signup successful',
        code: 'CREATED',
        user: user,
        error: null,

      }

      return user_signup_success;
      
    } catch (err: unknown) {
      if (err instanceof RpcException) {
          const rpcError = (err as RpcException).getError() as {
            code?: string;
            message?: string;
            details?: unknown;
          };
              const failure =  {
                success: false,
                message: rpcError.message,
                code: rpcError.code,
                error: {
                  code: rpcError.code,
                  message: rpcError.message,
                  details: rpcError.details ?? null,
                },
              }
        return failure;
      }
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
      const userGrpcService = this.getGrpcService();
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