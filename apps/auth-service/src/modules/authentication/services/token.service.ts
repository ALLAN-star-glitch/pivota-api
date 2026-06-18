
/* eslint-disable @typescript-eslint/no-explicit-any */
// apps/auth-service/src/modules/authentication/services/token.service.ts
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisSessionService } from '@pivota-api/shared-redis';
import { JwtPayload } from '@pivota-api/interfaces';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly defaultAccessTokenExpiry: string;
  private readonly defaultRefreshTokenExpiry: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly redisSession: RedisSessionService,
    private readonly configService: ConfigService,
  ) {
    // Read from environment variables with defaults
    this.defaultAccessTokenExpiry = this.configService.get<string>('JWT_EXPIRES_IN', '15m');
    this.defaultRefreshTokenExpiry = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    
    this.logger.log('🔐 Token Service initialized');
    this.logger.log(`  Access token expiry: ${this.defaultAccessTokenExpiry}`);
    this.logger.log(`  Refresh token expiry: ${this.defaultRefreshTokenExpiry}`);
  }

  /**
   * Blacklist a token
   */
  async blacklistToken(tokenId: string): Promise<void> {
    await this.redisSession.blacklistToken(tokenId);
  }

  /**
   * Generate tokens with explicit expiry calculation
   * Uses environment variables for expiry durations
   */
  async generateTokens(
    payload: JwtPayload,
    accessTokenExpiry?: string,
    refreshTokenExpiry?: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    tokenId: string;
  }> {
    // ✅ Ensure sub is defined
    if (!payload.sub) {
      this.logger.error('❌ Token generation failed: sub is undefined');
      throw new Error('User ID (sub) is required for token generation');
    }

    const tokenId = payload.jti || `${payload.sub}-${Date.now()}`;
    const now = Math.floor(Date.now() / 1000);
    
    // ✅ Use provided expiry or fallback to config defaults
    const accessExpiry = accessTokenExpiry || this.defaultAccessTokenExpiry;
    const refreshExpiry = refreshTokenExpiry || this.defaultRefreshTokenExpiry;
    
    // ✅ Parse durations to seconds
    const accessExpirySeconds = this.parseDuration(accessExpiry);
    const refreshExpirySeconds = this.parseDuration(refreshExpiry);
    
    // ✅ Build access token payload with explicit exp
    const accessPayload = {
      sub: payload.sub,
      jti: tokenId,
      iat: now,
      exp: now + accessExpirySeconds,
      email: payload.email,
      accountId: payload.accountId,
      role: payload.role || 'Individual',
      accountType: payload.accountType || 'INDIVIDUAL',
      organizationUuid: payload.organizationUuid || null,
      professionalId: payload.professionalId,
    };

    // ✅ Build refresh token payload with explicit exp
    const refreshPayload = {
      sub: payload.sub,
      jti: tokenId,
      iat: now,
      exp: now + refreshExpirySeconds,
      email: payload.email,
      accountId: payload.accountId,
      role: payload.role || 'Individual',
      accountType: payload.accountType || 'INDIVIDUAL',
      organizationUuid: payload.organizationUuid || null,
      professionalId: payload.professionalId,
    };

    // ✅ Remove undefined values from both payloads
    [accessPayload, refreshPayload].forEach(p => {
      Object.keys(p).forEach(key => {
        if (p[key] === undefined || p[key] === null) {
          delete p[key];
        }
      });
    });

    // ✅ Sign WITHOUT expiresIn (since we set exp explicitly in payload)
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload),
      this.jwtService.signAsync(refreshPayload),
    ]);

    // ✅ Log token generation details for debugging
    const decodedAccess = this.jwtService.decode(accessToken) as any;
    const decodedRefresh = this.jwtService.decode(refreshToken) as any;
    
    this.logger.debug(`✅ Tokens generated for user: ${payload.sub}, tokenId: ${tokenId}`);
    this.logger.debug(`  Access token expires: ${new Date(decodedAccess.exp * 1000).toISOString()} (${accessExpiry})`);
    this.logger.debug(`  Refresh token expires: ${new Date(decodedRefresh.exp * 1000).toISOString()} (${refreshExpiry})`);

    return {
      accessToken,
      refreshToken,
      tokenId,
    };
  }

  /**
   * Parse duration string to seconds
   * Supports formats: '15m', '7d', '1h', '3600s', '30', '86400'
   */
  private parseDuration(duration: string): number {
    // ✅ Handle numeric values (treat as seconds)
    if (/^\d+$/.test(duration)) {
      const seconds = parseInt(duration);
      this.logger.debug(`Parsed numeric duration: ${duration} = ${seconds}s`);
      return seconds;
    }
    
    // ✅ Handle duration strings like '15m', '7d', '1h'
    const unit = duration.slice(-1);
    const value = parseInt(duration.slice(0, -1));
    
    if (isNaN(value)) {
      this.logger.warn(`⚠️ Invalid duration format: "${duration}", defaulting to 15 minutes (900s)`);
      return 900; // 15 minutes default
    }
    
    let seconds: number;
    switch (unit) {
      case 's':
        seconds = value;
        break;
      case 'm':
        seconds = value * 60;
        break;
      case 'h':
        seconds = value * 3600;
        break;
      case 'd':
        seconds = value * 86400;
        break;
      default:
        // If no unit, assume seconds
        if (!isNaN(parseInt(duration))) {
          seconds = parseInt(duration);
        } else {
          this.logger.warn(`⚠️ Unknown duration unit: "${unit}", defaulting to 15 minutes (900s)`);
          seconds = 900;
        }
    }
    
    this.logger.debug(`Parsed duration: ${duration} = ${seconds}s`);
    return seconds;
  }

  /**
   * Validate refresh token and get decoded payload
   */
  async validateRefreshToken(refreshToken: string): Promise<JwtPayload> {
    try {
      return await this.jwtService.verifyAsync<JwtPayload>(refreshToken);
    } catch (error) {
      this.logger.warn(`⚠️ Refresh token validation failed: ${error.message}`);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Decode token without validation (for inspection)
   */
  decodeToken(token: string): JwtPayload | null {
    try {
      return this.jwtService.decode(token) as JwtPayload;
    } catch {
      return null;
    }
  }

  /**
   * Check if a token is expired
   */
  isTokenExpired(token: string): boolean {
    try {
      const decoded = this.jwtService.decode(token) as any;
      if (!decoded || !decoded.exp) {
        return true;
      }
      const now = Math.floor(Date.now() / 1000);
      const isExpired = decoded.exp < now;
      if (isExpired) {
        this.logger.debug(`Token expired: exp=${decoded.exp}, now=${now}`);
      }
      return isExpired;
    } catch (error) {
      this.logger.warn(`Failed to check token expiry: ${error.message}`);
      return true;
    }
  }

  /**
   * Get token expiry time in seconds
   */
  getTokenExpiry(token: string): number | null {
    try {
      const decoded = this.jwtService.decode(token) as any;
      return decoded?.exp || null;
    } catch {
      return null;
    }
  }

  /**
   * Get time remaining until token expires (in seconds)
   */
  getTokenTimeRemaining(token: string): number {
    const expiry = this.getTokenExpiry(token);
    if (!expiry) {
      return 0;
    }
    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, expiry - now);
  }
}