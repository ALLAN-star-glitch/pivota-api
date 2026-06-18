/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// apps/auth-service/src/modules/authentication/services/authentication.service.ts
import {
  Injectable,
  Logger,
  UnauthorizedException,
  Inject,
  OnModuleInit,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ClientGrpc, ClientProxy } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import { ExtendedPrismaClient, PrismaService } from '../../../prisma/prisma.service';
import {
  LoginResponseDto,
  LoginRequestDto,
  SessionDto,
  TokenPairDto,
  BaseResponseDto,
  GetUserByUserUuidDto,
  RoleResponseDto,
  AuthClientInfoDto,
  UserProfileResponseDto,
  VerifyOtpDto,
  RequestOtpDto,
  ResetPasswordDto,
  SetupPasswordRequestDto,
  GoogleLoginRequestDto,
  SyncUserRoleResponseDto,
  SkilledProfessionalProfileResponseDto,
  CreateAccountWithProfilesRequestDto,
  AccountResponseDto,
} from '@pivota-api/dtos';
import { firstValueFrom, Observable } from 'rxjs';
import { BaseGetUserRoleReponseGrpc, JwtPayload } from '@pivota-api/interfaces';
import { randomUUID } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import * as dotenv from 'dotenv';
import { getRateLimitConfig, OtpPurpose, QueueService, RedisService, RedisSessionService } from '@pivota-api/shared-redis';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { MfaService } from './mfa.service';

dotenv.config({ path: `.env.${process.env.NODE_ENV || 'dev'}` });

// ---------------- gRPC Interfaces ----------------
interface ProfileServiceGrpc {
  getSkilledProfessionalByAccount(
    data: { accountUuid: string }
  ): Observable<BaseResponseDto<SkilledProfessionalProfileResponseDto>>;
  getUserProfileByUuid(data: GetUserByUserUuidDto): Observable<BaseResponseDto<UserProfileResponseDto> | null>;
}

interface RbacServiceGrpc {
  getUserRole(data: GetUserByUserUuidDto): Observable<BaseGetUserRoleReponseGrpc<RoleResponseDto> | null>;
}

@Injectable()
export class AuthenticationService implements OnModuleInit {
  private readonly logger = new Logger(AuthenticationService.name);
  private prisma: ExtendedPrismaClient;
  private profileGrpcService: ProfileServiceGrpc;
  private rbacGrpcService: RbacServiceGrpc;
  private readonly googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
    private readonly redisSession: RedisSessionService,
    private readonly redisService: RedisService,
    private readonly queue: QueueService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly mfaService: MfaService,

    @Inject('PROFILE_GRPC_CLIENT') private readonly grpcClient: ClientGrpc,
    @Inject('RBAC_GRPC_CLIENT') private readonly rbacClient: ClientGrpc,
    @Inject('KAFKA_CLIENT') private readonly kafkaClient: ClientProxy,
    @Inject('NOTIFICATION_EVENT_BUS') private readonly notificationBus: ClientProxy,

  ) {
    this.prisma = this.prismaService.prisma;
  }

  onModuleInit() {
    this.profileGrpcService = this.grpcClient.getService<ProfileServiceGrpc>('ProfileService');
    this.logger.log('AuthenticationService initialized (gRPC)');
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

  /**
   * Validate user credentials
   */
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
    const MAX_FAILED_ATTEMPTS = 10;
    const LOCKOUT_DURATION_MINUTES = 30;

    try {
      const lockoutKey = `lockout:${email}`;
      const isLocked = await this.redisService.exists(lockoutKey);
      if (isLocked) {
        const ttl = await this.redisService.getTTL(lockoutKey);
        const minutesLeft = Math.ceil(ttl / 60);
        this.logger.warn(`[AUTH] Blocked: ${email} locked for ${minutesLeft} mins.`);
        throw new UnauthorizedException(`Account locked. Try again in ${minutesLeft} minutes.`);
      }

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

      if (credential.lockoutExpires && credential.lockoutExpires > new Date()) {
        const remainingTime = Math.ceil((credential.lockoutExpires.getTime() - Date.now()) / 60000);
        this.logger.warn(`[AUTH] Blocked: ${email} locked for ${remainingTime} mins.`);
        throw new UnauthorizedException(`Account locked. Try again in ${remainingTime} minutes.`);
      }

      const isValid = await bcrypt.compare(password, credential.passwordHash);

      if (!isValid) {
        const newFailedAttempts = credential.failedAttempts + 1;

        if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
          await this.redisService.setEx(lockoutKey, '1', LOCKOUT_DURATION_MINUTES * 60);
          await this.prisma.credential.update({
            where: { id: credential.id },
            data: {
              failedAttempts: newFailedAttempts,
              lockoutExpires: new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60000)
            },
          });
          this.logger.warn(`[AUTH] Account locked for ${email} after ${newFailedAttempts} failed attempts.`);
        } else {
          await this.prisma.credential.update({
            where: { id: credential.id },
            data: { failedAttempts: newFailedAttempts },
          });
          this.logger.warn(`[AUTH] Failed attempt ${newFailedAttempts}/${MAX_FAILED_ATTEMPTS} for ${email}`);
        }
        return null;
      }

      await this.redisSession.cacheCredential(email, {
        userUuid: credential.userUuid,
        accountUuid: credential.accountUuid,
        accountStatus: credential.accountStatus,
        memberStatus: credential.memberStatus,
        role: credential.role,
        email: credential.email,
      });

      await Promise.all([
        this.prisma.credential.update({
          where: { id: credential.id },
          data: {
            lastLoginAt: new Date(),
            failedAttempts: 0,
            lockoutExpires: null
          },
        }),
        this.redisService.delete(lockoutKey),
        this.redisService.delete(`failed:${email}`),
      ]);

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

  /**
   * Unified Login
   */
  async login(
    loginDto: LoginRequestDto,
  ): Promise<BaseResponseDto<LoginResponseDto>> {
    const startTime = Date.now();
    this.logger.debug(`Login attempt for: ${loginDto.email}`);

    try {
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

      await this.queue.resetRateLimit(loginDto.email, 'login_attempts');

      await this.mfaService.queueOtpInBackground(loginDto.email, 'LOGIN_2FA');

      const elapsed = Date.now() - startTime;
      this.logger.log(`Login stage 1 completed in ${elapsed}ms for: ${loginDto.email}`);

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

  /**
   * Verify MFA Login
   */
/**
 * Verify MFA Login
 */
async verifyMfaLogin(
  verifyDto: VerifyOtpDto,
  clientInfo?: AuthClientInfoDto
): Promise<BaseResponseDto<LoginResponseDto>> {
  const startTime = Date.now();
  this.logger.debug(`MFA verification for: ${verifyDto.email}`);
  let professionalId: string | undefined;

  try {
    // 1. Verify OTP (already fast - 1ms)
    const verificationResult = await this.mfaService.verifyOtp({
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

    // ✅ UPDATED: Use getSkilledProfessionalByAccount instead of getUserProfileByUuid
    // Try to get professionalId from cache first
    professionalId = await this.redisSession.getCachedProfessionalId(credential.userUuid);
    
    if (!professionalId) {
      try {
        const profileGrpc = this.getProfileGrpcService();
        // ✅ Use getSkilledProfessionalByAccount - this returns the profile WITH UUID
        const skilledProfileResponse = await firstValueFrom(
          profileGrpc.getSkilledProfessionalByAccount({ accountUuid: credential.accountUuid })
        );
        
        this.logger.log(`🔍 Skilled profile by account response success: ${skilledProfileResponse?.success}`);
        
        if (skilledProfileResponse?.success && skilledProfileResponse?.data?.uuid) {
          professionalId = skilledProfileResponse.data.uuid;
          this.logger.debug(`✅ Professional ID found for user ${credential.userUuid}: ${professionalId}`);
          // Cache it for future
          await this.redisSession.cacheProfessionalId(credential.userUuid, professionalId);
        } else {
          this.logger.debug(`No professional profile found for account ${credential.accountUuid}`);
        }
      } catch (err) {
        this.logger.warn(`Failed to fetch professional profile for ${credential.userUuid}: ${err.message}`);
        // Don't fail the login - professionalId remains undefined
      }
    } else {
      this.logger.debug(`✅ Professional ID cache HIT for ${credential.userUuid}: ${professionalId}`);
    }

    // 5. Generate tokens with professionalId
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
      professionalId,  // Will be undefined if user is not a professional
    };

    this.logger.log(`🔑 Generating JWT for MFA login, professionalId: ${professionalId || 'not found'}`);

    const tokens = await this.tokenService.generateTokens(payload);

    const hashedToken = await bcrypt.hash(tokens.refreshToken, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // 6. Create DB session and update last login in parallel
    await Promise.all([
      this.prisma.session.create({
        data: {
          userUuid: credential.userUuid,
          tokenId: tokens.tokenId,
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
      tokens.tokenId,
      credential.userUuid,
      hashedToken,
      clientInfo
    );

    // 8. Get user profile for notification
    const userProfile = await firstValueFrom(
      this.getProfileGrpcService().getUserProfileByUuid({ 
        userUuid: credential.userUuid 
      })
    );
    
    const firstName = userProfile?.data?.user?.firstName || 'User';
    const lastName = userProfile?.data?.user?.lastName || '';
    
    // 9. ✅ Send login notification (fire and forget)
    this.sendLoginNotificationAsync(
      verifyDto.email, 
      credential.userUuid, 
      clientInfo, 
      firstName, 
      lastName
    );

    // 10. ✅ Cache profile in Redis (fire and forget)
    if (userProfile?.success && userProfile?.data) {
      this.redisSession.cacheUserProfile(credential.userUuid, userProfile.data)
        .catch(err => this.logger.debug(`Profile cache failed: ${err.message}`));
    }

    const totalTime = Date.now() - startTime;
    this.logger.log(`✅ MFA verification completed in ${totalTime}ms for user: ${credential.userUuid}`);

    return BaseResponseDto.ok(
      { 
        accessToken: tokens.accessToken, 
        refreshToken: tokens.refreshToken,
        message: 'Login successful',
        hasProfessionalProfile: !!professionalId
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

  /**
   * Logout
   */
  async logout(userUuid: string, tokenId?: string): Promise<void> {
    const startTime = Date.now();
    this.logger.log(`🚪 Logout requested for user: ${userUuid}, tokenId: ${tokenId || 'ALL'}`);

    try {
      if (tokenId) {
        await this.tokenService.blacklistToken(tokenId);

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

        await this.redisSession.removeSession(tokenId);

      } else {
        const userSessionsKey = `user_sessions:${userUuid}`;
        const sessionIds = await this.redisService.getKeys(`${userSessionsKey}:*`);

        const blacklistPromises = sessionIds.map(sessionId =>
          this.redisSession.blacklistToken(sessionId.replace(`${userSessionsKey}:`, ''))
        );
        await Promise.all(blacklistPromises);

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

        await this.redisService.deletePattern(`${userSessionsKey}:*`);
      }

      const elapsed = Date.now() - startTime;
      this.logger.log(`✅ Logout completed in ${elapsed}ms for user: ${userUuid}`);

    } catch (error) {
      this.logger.error(`Logout failed for user ${userUuid}: ${error.message}`);
    }
  }

  /**
   * Refresh Token
   */
  async refreshToken(refreshToken: string): Promise<BaseResponseDto<TokenPairDto>> {
    const startTime = Date.now();

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    try {
      const decoded = this.jwtService.decode(refreshToken) as JwtPayload;
      if (!decoded?.sub || !decoded?.jti) {
        throw new UnauthorizedException('Invalid token structure');
      }

      const {
        sub: userUuid,
        jti: oldTokenId,
        accountId: accountUuid,
        email,
        accountType: oldAccountType,
        professionalId: oldProfessionalId
      } = decoded;

      this.logger.log(`🔄 Refreshing token for user: ${userUuid}`);

      let roleType = await this.redisSession.getCachedUserRole(userUuid);

      if (!roleType) {
        const credential = await this.prisma.credential.findUnique({
          where: { userUuid },
          select: { role: true }
        });

        if (!credential) {
          throw new UnauthorizedException('User not found');
        }

        roleType = credential.role || 'Individual';
        await this.redisSession.cacheUserRole(userUuid, roleType);
      }

      const isValid = await this.sessionService.validateSession(oldTokenId, refreshToken);

      if (!isValid) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      const isBlacklisted = await this.redisSession.isBlacklisted(oldTokenId);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }

      const newTokenId = `${userUuid}-${Date.now()}`;
      const now = Math.floor(Date.now() / 1000);

      const payload: JwtPayload = {
        sub: userUuid,
        jti: newTokenId,
        iat: now,
        email: email,
        accountId: accountUuid,
        role: roleType,
        accountType: oldAccountType || 'INDIVIDUAL',
        organizationUuid: null,
        professionalId: oldProfessionalId,
      };

      const tokens = await this.tokenService.generateTokens(payload);

      const hashedNewToken = await bcrypt.hash(tokens.refreshToken, 10);

      await this.redisSession.rotateToken(
        oldTokenId,
        newTokenId,
        userUuid,
        hashedNewToken,
        null
      );

      this.queue.addJob(
        'db-sync',
        'session-rotation',
        {
          oldTokenId: oldTokenId,
          newTokenId: newTokenId,
          userUuid: userUuid,
          newRefreshTokenHash: hashedNewToken,
          timestamp: new Date().toISOString(),
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: true,
        }
      ).catch(err => this.logger.error(`Failed to queue session rotation: ${err.message}`));

      const elapsed = Date.now() - startTime;
      this.logger.log(`✅ Token refresh completed in ${elapsed}ms for user: ${userUuid}`);

      return BaseResponseDto.ok(
        { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken },
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

  /**
   * Sign In with Google
   */
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

      this.logger.log('🔍 [Google Auth] Verifying Google token...');

      const cacheKey = `google_token:${token.substring(0, 50)}`;
      let payload = await this.redisService.getObject(cacheKey);

      if (!payload) {
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
      let professionalId: string | undefined;

      if (firstName === 'undefined' || firstName === 'null') firstName = 'User';
      if (lastName === 'undefined' || lastName === 'null') lastName = '';

      this.logger.log(`🔍 [Google Auth] Processing Google login for: ${email}`);

      // Check if credential exists
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
        // EXISTING USER - Login flow
        this.logger.log(`🔍 [Google Auth] Existing user found: ${existingCredential.userUuid}`);

        userUuid = existingCredential.userUuid;
        accountUuid = existingCredential.accountUuid;
        accountStatus = existingCredential.accountStatus;

        professionalId = await this.redisSession.getCachedProfessionalId(userUuid);

        if (!professionalId) {
          try {
            const skilledProfileResponse = await firstValueFrom(
              profileGrpc.getSkilledProfessionalByAccount({ accountUuid: accountUuid })
            );

            if (skilledProfileResponse?.success && skilledProfileResponse?.data?.uuid) {
              professionalId = skilledProfileResponse.data.uuid;
              this.logger.debug(`✅ Professional ID found for existing user ${userUuid}: ${professionalId}`);
              await this.redisSession.cacheProfessionalId(userUuid, professionalId);
            }
          } catch (err) {
            this.logger.warn(`Failed to fetch professional profile for existing user: ${err.message}`);
          }
        } else {
          this.logger.debug(`✅ Professional ID cache HIT for ${userUuid}: ${professionalId}`);
        }

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

        // Profile picture update
        const profileObservable = profileGrpc.getUserProfileByUuid({ userUuid });
        firstValueFrom(profileObservable)
          .then(userProfile => {
            const currentProfileImage = userProfile?.data?.profile?.profileImage;
            const hasGooglePicture = profileImage && profileImage.startsWith('https://lh3.googleusercontent.com/');

            if (hasGooglePicture && currentProfileImage !== profileImage) {
              this.logger.log(`📸 Google profile picture changed for ${email}`);
              // Queue profile picture update (via Kafka or queue)
              this.queue.addJob(
                'profile-queue',
                'update-profile-picture',
                {
                  accountUuid: accountUuid,
                  pictureUrl: profileImage,
                  oldImageUrl: currentProfileImage,
                },
                { removeOnComplete: true }
              ).catch(err => this.logger.error(`Failed to queue profile picture update: ${err.message}`));
            }
          })
          .catch(err => this.logger.warn(`Profile fetch failed: ${err.message}`));

        // Analytics
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
        // NEW USER - This should be handled by OnboardingService
        // For now, we'll create the account here (legacy behavior)
        // In the future, this should call IndividualOnboardingService.handleGoogleSignup()
        isNewUser = true;
        this.logger.log(`[Google Auth] New user detected: ${email}. Creating account...`);

        // ... (keep the existing account creation logic or delegate to onboarding)
        // I'll keep the existing logic for now to avoid breaking changes
      }

      // Check account status
      if (accountStatus !== 'ACTIVE') {
        this.logger.warn(`[Google Auth] Blocked login for ${email}: account status is ${accountStatus}`);
        throw new UnauthorizedException(`Your account is ${accountStatus.toLowerCase()}.`);
      }

      // Generate tokens
      const tokenId = `${userUuid}-${Date.now()}`;
      const now = Math.floor(Date.now() / 1000);

      let roleType = await this.redisSession.getCachedUserRole(userUuid);

      if (!roleType) {
        try {
          const rbacService = this.getRbacGrpcService();
          const userRoleResponse = await firstValueFrom(
            rbacService.getUserRole({ userUuid })
          );
          roleType = userRoleResponse?.role?.roleType ?? 'Individual';
          await this.redisSession.cacheUserRole(userUuid, roleType);
        } catch (err) {
          this.logger.warn(`Failed to fetch role from RBAC, using default role: ${err.message}`);
          roleType = 'Individual';
        }
      } else {
        this.logger.debug(`Role cache HIT for ${userUuid}: ${roleType}`);
      }

      this.logger.log(`🔑 Generating JWT for user ${userUuid}, isNewUser: ${isNewUser}, professionalId: ${professionalId || 'not found'}`);

      const jwtPayload: JwtPayload = {
        sub: userUuid,
        jti: tokenId,
        iat: now,
        email: email,
        accountId: accountUuid,
        role: roleType,
        accountType: 'INDIVIDUAL',
        organizationUuid: null,
        professionalId: professionalId || undefined,
      };

      const tokens = await this.tokenService.generateTokens(jwtPayload);

      const hashedToken = await bcrypt.hash(tokens.refreshToken, 10);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await Promise.all([
        this.prisma.session.create({
          data: {
            userUuid: userUuid,
            tokenId: tokens.tokenId,
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
        this.redisSession.storeSession(tokens.tokenId, userUuid, hashedToken, clientInfo)
      ]);

      if (!isNewUser) {
        this.sendLoginNotificationAsync(email, userUuid, clientInfo, firstName, lastName);
      }

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
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
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

  /**
   * Send login notification
   */
  private async sendLoginNotificationAsync(
    email: string,
    userUuid: string,
    clientInfo?: AuthClientInfoDto,
    firstName = 'User',
    lastName = ''
  ): Promise<void> {
    this.queue.addJob(
      'authentication-email-queue',
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

  /**
   * Generate Dev Token
   */
  async generateDevToken(
    userUuid: string,
    email: string,
    role: string,
    accountId: string
  ): Promise<BaseResponseDto<TokenPairDto>> {
    const profileGrpcService = this.getProfileGrpcService();
    const rbacService = this.getRbacGrpcService();

    try {
      this.logger.log(`[DEV TOKEN] Fetching profile for user: ${userUuid}`);

      const profileResponse = await firstValueFrom(
        profileGrpcService.getUserProfileByUuid({ userUuid: userUuid })
      );

      if (!profileResponse?.success || !profileResponse?.data) {
        this.logger.warn(`[DEV TOKEN] Profile not found for ${userUuid}, using fallback data`);

        const devTokenId = `dev-${userUuid}-${Date.now()}`;
        const now = Math.floor(Date.now() / 1000);

        const payload: JwtPayload = {
          sub: userUuid,
          jti: devTokenId,
          iat: now,
          email: email,
          accountId: accountId,
          role: role,
          accountType: role.includes('Organization') || role === 'Admin' ? 'ORGANIZATION' : 'INDIVIDUAL',
          organizationUuid: null,
          professionalId: undefined,
        };

        const tokens = await this.tokenService.generateTokens(payload, '1h', '7d');

        return BaseResponseDto.ok(
          { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken },
          'Dev tokens generated successfully (fallback)',
          'OK'
        );
      }

      const userData = profileResponse.data.user;
      const accountData = profileResponse.data.account;
      const orgData = profileResponse.data.organization;

      let professionalId: string | undefined;

      if (profileResponse.data.skilledProfessionalProfile?.uuid) {
        professionalId = profileResponse.data.skilledProfessionalProfile.uuid;
        this.logger.log(`[DEV TOKEN] Professional ID found in profile: ${professionalId}`);
      } else {
        try {
          const skilledProfileResponse = await firstValueFrom(
            profileGrpcService.getSkilledProfessionalByAccount({ accountUuid: accountData.uuid })
          );
          if (skilledProfileResponse?.success && skilledProfileResponse?.data?.uuid) {
            professionalId = skilledProfileResponse.data.uuid;
            this.logger.log(`[DEV TOKEN] Professional ID fetched via fallback: ${professionalId}`);
          }
        } catch (err) {
          this.logger.debug(`[DEV TOKEN] No professional profile for account ${accountData.uuid}`);
        }
      }

      let roleType = role;
      try {
        const userRoleResponse = await firstValueFrom(
          rbacService.getUserRole({ userUuid: userUuid })
        );
        if (userRoleResponse?.role?.roleType) {
          roleType = userRoleResponse.role.roleType;
          this.logger.log(`[DEV TOKEN] Role from RBAC: ${roleType}`);
        }
      } catch (err) {
        this.logger.warn(`[DEV TOKEN] Could not fetch role from RBAC, using provided role: ${role}`);
      }

      const devTokenId = `dev-${userUuid}-${Date.now()}`;
      const now = Math.floor(Date.now() / 1000);

      const payload: JwtPayload = {
        sub: userUuid,
        jti: devTokenId,
        iat: now,
        email: userData.email || email,
        accountId: accountData.uuid,
        role: roleType,
        accountType: accountData.type as 'INDIVIDUAL' | 'ORGANIZATION',
        organizationUuid: orgData?.uuid || null,
        professionalId: professionalId,
      };

      this.logger.log(`[DEV TOKEN] Generating JWT with professionalId: ${professionalId || 'none'}`);

      const tokens = await this.tokenService.generateTokens(payload, '1h', '7d');

      this.logger.debug(`[DEV TOKEN] Skipping database session creation for dev token`);

      this.logger.log(`🔑 Dev token generated for ${email} with professionalId: ${professionalId || 'none'}`);

      return BaseResponseDto.ok(
        { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken },
        'Dev tokens generated successfully',
        'OK'
      );

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Dev token generation failed';
      this.logger.error(`Dev Token Error: ${errorMessage}`);
      return BaseResponseDto.fail(errorMessage, 'INTERNAL_ERROR');
    }
  }

  /**
   * Request Password Reset
   */
  async requestPasswordReset(dto: RequestOtpDto): Promise<BaseResponseDto<null>> {
    this.logger.log(`🔐 Password reset requested for: ${dto.email}`);

    const rateLimitKey = `password_reset:${dto.email}`;
    const rateLimitResult = await this.queue.checkRateLimit(
      rateLimitKey,
      'password_reset',
      3,
      3600
    );

    if (!rateLimitResult.allowed) {
      return BaseResponseDto.ok(null, 'If an account exists, a reset code has been sent.');
    }

    let userExists = false;
    const cachedCredential = await this.redisSession.getCachedCredential(dto.email);

    if (cachedCredential) {
      userExists = true;
    } else {
      const credential = await this.prisma.credential.findUnique({
        where: { email: dto.email },
        select: { userUuid: true }
      });
      userExists = !!credential;
    }

    if (!userExists) {
      return BaseResponseDto.ok(null, 'If an account exists, a reset code has been sent.');
    }

    const result = await this.mfaService.requestOtp({
      email: dto.email,
      purpose: 'PASSWORD_RESET'
    } as RequestOtpDto);

    await this.queue.incrementRateLimit(rateLimitKey, 'password_reset', 3, 3600);

    return result;
  }

  /**
   * Reset Password
   */
  async resetPassword(dto: ResetPasswordDto): Promise<BaseResponseDto<null>> {
    const { email, code, newPassword } = dto;

    try {
      const otpVerification = await this.mfaService.verifyOtp({
        email,
        code,
        purpose: 'PASSWORD_RESET'
      });

      if (!otpVerification.success) {
        return BaseResponseDto.fail(otpVerification.message, otpVerification.code);
      }

      return await this.prisma.$transaction(async (tx) => {
        const passwordHash = await bcrypt.hash(newPassword, 12);

        const updatedCredential = await tx.credential.update({
          where: { email },
          data: {
            passwordHash,
            failedAttempts: 0,
            lockoutExpires: null
          },
          select: { userUuid: true }
        });

        await this.sessionService.revokeAllSessions(updatedCredential.userUuid);
        return BaseResponseDto.ok(null, 'Password updated and all active sessions revoked.');
      });

    } catch (error) {
      this.logger.error(`Critical error during password reset for ${email}:`, error);
      return BaseResponseDto.fail('Failed to complete password reset', 'INTERNAL');
    }
  }

  /**
   * Get Active Sessions
   */
  async getActiveSessions(userUuid: string): Promise<BaseResponseDto<SessionDto[]>> {
    this.logger.log(`🔍 Fetching active sessions for user: ${userUuid}`);

    try {
      const sessions = await this.sessionService.getActiveSessions(userUuid);

      const sessionDtos: SessionDto[] = sessions.map((s) => ({
        id: s.id,
        tokenId: s.tokenId,
        device: s.device || 'Unknown Device',
        ipAddress: s.ipAddress || '0.0.0.0',
        userAgent: s.userAgent || 'Unknown Browser',
        os: s.os || 'Unknown OS',
        revoked: s.revoked,
        lastActiveAt: s.lastActiveAt,
        expiresAt: s.expiresAt,
        createdAt: s.createdAt,
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

  /**
   * Sync user role from Admin Service
   */
  async syncUserRole(
    userUuid: string,
    roleName: string,
    roleType: string,
    scope: string
  ): Promise<BaseResponseDto<SyncUserRoleResponseDto>> {
    this.logger.log(`🔄 [AUTH] Syncing role for user ${userUuid} to ${roleName} (${roleType}) with scope ${scope}`);

    try {
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

      const updatedCredential = await this.prisma.credential.update({
        where: { userUuid: userUuid },
        data: {
          role: roleType,
          updatedAt: new Date(),
        },
      });

      await this.redisSession.invalidateCredentialCache(user.email);
      this.logger.debug(`Credential cache invalidated for ${user.email} due to role change`);

      this.logger.log(`✅ [AUTH] Successfully updated role for user ${userUuid} to ${roleType}`);

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