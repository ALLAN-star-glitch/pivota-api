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


// ---------------- gRPC Interface ----------------
interface UserServiceGrpc {
  createUserProfile(data: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }): Observable<BaseUserResponseGrpc<UserResponseDto>>;

  getUserProfileByEmail(data: {
    email: string;
  }): Observable<BaseUserResponseGrpc<UserResponseDto> | null>;

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
    @Inject('USER_GRPC') private readonly grpcClient: ClientGrpc,
    @Inject('USER_RMQ') private readonly rabbitClient: ClientProxy,
    @Inject('RBAC_PACKAGE') private readonly rbacClient: ClientGrpc,  
  ) {}

  onModuleInit() {
    this.userGrpcService = this.grpcClient.getService<UserServiceGrpc>('UserService');
    this.logger.log('AuthService initialized (gRPC)');
    this.rbacGrpcService = this.rbacClient.getService<RbacServiceGrpc>('RbacService');
    this.logger.log('RbacService initialized (gRPC)');  
  }

  private getGrpcService(): UserServiceGrpc {
    if (!this.userGrpcService) {
      this.userGrpcService = this.grpcClient.getService<UserServiceGrpc>('UserService');
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
    const userGrpcService = this.getGrpcService();
    const userProfileGrpcResponse: BaseUserResponseGrpc<UserResponseDto> | null =
      await firstValueFrom(userGrpcService.getUserProfileByEmail({ email }));

    if (!userProfileGrpcResponse || !userProfileGrpcResponse.success || !userProfileGrpcResponse.user) {
      return null;
    }

    const userProfile = userProfileGrpcResponse.user;

    // Look up credentials using UUID
    const credential = await this.prisma.credential.findUnique({
      where: { userUuid: userProfile.uuid },
    });
    if (!credential) return null;

    // Check password
    const isValid = await bcrypt.compare(password, credential.passwordHash);
    if (!isValid) return null;

    return userProfile;
  }

  // ------------------ Generate Tokens ------------------
 async generateTokens(
  user: { uuid: string; email: string },
  clientInfo?: Pick<SessionDto, 'device' | 'ipAddress' | 'userAgent' | 'os'>,
): Promise<{ accessToken: string; refreshToken: string }> {

  const getGrpcService = this.getRbacGrpcService();
  const userRoleResponse = await firstValueFrom(
    getGrpcService.getUserRole({ userUuid: user.uuid }),
  );

  // Single role name for JWT
  const roleName: string = userRoleResponse?.role?.name ?? 'Guest'; // default role if none

  const payload: JwtPayload = {
    userUuid: user.uuid,
    email: user.email,
    role: roleName,
  };

  this.logger.debug(
    `Generating JWT for user role: ${JSON.stringify(
      userRoleResponse,
      null,
      2,
    )}`,
  );

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

    this.logger.log(`Calling CreateUserProfile ... `)
    // 1️⃣ Call UserService to create user profile
    const userProfile$ = userGrpcService.createUserProfile({
      email: signupDto.email,
      firstName: signupDto.firstName,
      lastName: signupDto.lastName,
      phone: signupDto.phone,
    });

    const userResponse = await firstValueFrom(userProfile$);

    this.logger.debug(`User Response: ${JSON.stringify(userResponse)}`)

    if (!userResponse.success || !userResponse.user) {
      this.logger.warn('⚠️ User service failed to create profile', userResponse);

      const failedResponse = {  
        success: false,
        message: 'User profile creation failed',
        code: 'INTERNAL',
        user: null, 
        error: { code: 'INTERNAL', message: 'User creation failed' },
      };


      return failedResponse;
    }

    const user = userResponse.user;

    // 2️⃣ Hash password and create credentials
    const hashedPassword = await bcrypt.hash(signupDto.password, 10);
    await this.prisma.credential.create({
      data: {
        userUuid: user.uuid,
        passwordHash: hashedPassword,
      },
    });

    this.logger.log('Credentials created successfully for user:', user.uuid);

    // 3️⃣ Fetch role from RBAC
    const rbacGrpcService = this.getRbacGrpcService();
    const userRoleResponse = await firstValueFrom(
      rbacGrpcService.getUserRole({ userUuid: user.uuid })
    );
    const roleName = userRoleResponse?.role?.name ?? 'RegisteredUser';

    // 4️⃣ Include role in the user object
    const userWithRole: UserResponseDto = {
      ...user,
      role: roleName,
    };

    const grpcSuccessBaseResponse = {
      success: true,
      message: 'Signup successful',
      code: 'Ok',
      user: userWithRole,
      error: null,
    };  

    // 5️⃣ Return signup response
    return grpcSuccessBaseResponse;
  } catch (error: unknown) {
    this.logger.error('❌ Signup failed', error);

    if (typeof error === 'object' && error !== null && 'code' in error) {
      const code = (error as { code?: string }).code;
      if (code === 'ALREADY_EXISTS')
        return BaseResponseDto.fail('User already registered', 'ALREADY_EXISTS');
    }

    return BaseResponseDto.fail('Signup failed', 'INTERNAL');
  }
}





  // ------------------ Login ------------------
 async login(
  loginDto: LoginRequestDto,
  clientInfo?: Pick<SessionDto, 'device' | 'ipAddress' | 'userAgent' | 'os'>,
): Promise<BaseResponseDto<LoginResponseDto>> {
  // 1️ Validate user credentials
  const user = await this.validateUser(loginDto.email, loginDto.password);
  if (!user) throw new UnauthorizedException('Invalid credentials');

  // 2️ Fetch role from RBAC service
  const rbacGrpcService = this.getRbacGrpcService();
  const userRoleResponse = await firstValueFrom(
    rbacGrpcService.getUserRole({ userUuid: user.uuid })
  );
  const roleName = userRoleResponse?.role?.name ?? 'RegisteredUser';

  this.logger.debug(`User Role: ${roleName}`)


  // 3️Generate access and refresh tokens
  const { accessToken, refreshToken } = await this.generateTokens(
    { uuid: user.uuid, email: user.email },
    clientInfo,
  );

  // 4️ Emit login email event
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
  this.logger.debug(`📤 [AuthService] Login email payload: ${JSON.stringify(payload)}`);

  // 5️ Attach role to user object along with tokens
  const authUser = {
    ...user,
    role: roleName,
    accessToken,
    refreshToken,
  };

  // 6️ Return login response
  const loginResponse = {
    success: true,
    message: 'Login successful',
    code: 'OK',
    user: authUser,
    error: null,
  };

  return loginResponse;
}


  // ------------------ Refresh Token ------------------
  async refreshToken(refreshToken: string): Promise<TokenPairDto> {
    if (!refreshToken) throw new UnauthorizedException('Refresh token is required');

    const payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken);

    const user$ = this.userGrpcService.getUserProfileByUuid({ userUuid: payload.userUuid });
    const user: BaseUserResponseGrpc<UserResponseDto> = await firstValueFrom(user$);

    const sessions = await this.prisma.session.findMany({
      where: { userUuid: payload.userUuid, revoked: false },
    });

    const validSession = sessions.find((s) => bcrypt.compareSync(refreshToken, s.hashedToken));
    if (!validSession) throw new UnauthorizedException('Invalid or revoked refresh token');

    return this.generateTokens({ uuid: user.user.uuid, email: user.user.email });
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
}
