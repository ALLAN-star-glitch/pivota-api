// shared-redis/src/services/redis-session.service.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

@Injectable()
export class RedisSessionService {
  private readonly logger = new Logger(RedisSessionService.name);
  private readonly SESSION_PREFIX = 'session:';
  private readonly USER_SESSIONS_PREFIX = 'user_sessions:';
  private readonly BLACKLIST_PREFIX = 'blacklist:';
  private readonly PROFILE_CACHE_PREFIX = 'profile:';
  
  private readonly REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days
  private readonly PROFILE_CACHE_TTL = 300; // 5 minutes

  constructor(private readonly redis: RedisService) {}

  async storeSession(
    tokenId: string,
    userUuid: string,
    refreshTokenHash: string,
    clientInfo: any,
  ): Promise<void> {
    const sessionKey = `${this.SESSION_PREFIX}${tokenId}`;
    const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userUuid}`;
    
    const sessionData = {
      userUuid,
      refreshTokenHash,
      clientInfo: JSON.stringify(clientInfo),
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      expiresAt: Date.now() + (this.REFRESH_TOKEN_TTL * 1000),
    };
    
    await this.redis.setObject(sessionKey, sessionData, this.REFRESH_TOKEN_TTL);
    await this.redis.set(`${userSessionsKey}:${tokenId}`, Date.now().toString(), this.REFRESH_TOKEN_TTL);
  }

  async getSession(tokenId: string): Promise<any | null> {
    const sessionKey = `${this.SESSION_PREFIX}${tokenId}`;
    return await this.redis.getObject(sessionKey);
  }

  async validateRefreshToken(tokenId: string, refreshToken: string): Promise<boolean> {
    const session = await this.getSession(tokenId);
    if (!session) return false;
    
    const isBlacklisted = await this.isBlacklisted(tokenId);
    if (isBlacklisted) return false;
    
    const bcrypt = require('bcrypt');
    return await bcrypt.compare(refreshToken, session.refreshTokenHash);
  }

 // keep this for other use cases, but don't use it in refreshToken
async rotateToken(
  oldTokenId: string, 
  newTokenId: string, 
  userUuid: string, 
  newRefreshTokenHash: string, 
  clientInfo: any
): Promise<void> {
  // Store new session first
  await this.storeSession(newTokenId, userUuid, newRefreshTokenHash, clientInfo);
  
  // Then blacklist old token (with short TTL)
  await this.blacklistToken(oldTokenId, 900); // 15 minutes TTL for blacklist
  
  // Remove old session from Redis
  await this.removeSession(oldTokenId);
  
  // Update user sessions index
  const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userUuid}`;
  await this.redis.delete(`${userSessionsKey}:${oldTokenId}`);
  await this.redis.set(`${userSessionsKey}:${newTokenId}`, Date.now().toString(), this.REFRESH_TOKEN_TTL);
}

  async blacklistToken(tokenId: string, ttlSeconds = 900): Promise<void> {
    const blacklistKey = `${this.BLACKLIST_PREFIX}${tokenId}`;
    await this.redis.set(blacklistKey, '1', ttlSeconds);
  }

  async isBlacklisted(tokenId: string): Promise<boolean> {
    const blacklistKey = `${this.BLACKLIST_PREFIX}${tokenId}`;
    return await this.redis.exists(blacklistKey);
  }

  async removeSession(tokenId: string): Promise<void> {
    const sessionKey = `${this.SESSION_PREFIX}${tokenId}`;
    await this.redis.delete(sessionKey);
  }

  /**
   * Delete all keys matching a pattern
   * Delegates to RedisService.deletePattern()
   */
  async deletePattern(pattern: string): Promise<void> {
    await this.redis.deletePattern(pattern);
  }

  async updateLastActive(tokenId: string): Promise<void> {
    const session = await this.getSession(tokenId);
    if (session) {
      session.lastActiveAt = Date.now();
      const sessionKey = `${this.SESSION_PREFIX}${tokenId}`;
      await this.redis.setObject(sessionKey, session, this.REFRESH_TOKEN_TTL);
    }
  }

  async cacheUserProfile(userUuid: string, profileData: any): Promise<void> {
    const cacheKey = `${this.PROFILE_CACHE_PREFIX}${userUuid}`;
    await this.redis.setObject(cacheKey, profileData, this.PROFILE_CACHE_TTL);
  }

  async getCachedUserProfile(userUuid: string): Promise<any | null> {
    const cacheKey = `${this.PROFILE_CACHE_PREFIX}${userUuid}`;
    return await this.redis.getObject(cacheKey);
  }

  /**
   * Cache credential (ONLY non-sensitive data)
   * NEVER cache: passwordHash, failedAttempts, lockoutExpires
   */
  async cacheCredential(email: string, credential: any): Promise<void> {
    const cacheKey = `credential:${email}`;
    
    // Cache ONLY safe fields
    const safeCredential = {
      userUuid: credential.userUuid,
      accountUuid: credential.accountUuid,
      accountStatus: credential.accountStatus,
      memberStatus: credential.memberStatus,
      role: credential.role,
      email: credential.email,
      // EXCLUDED: passwordHash, failedAttempts, lockoutExpires
    };
    
    // Short TTL - 5 minutes max for credentials
    await this.redis.setObject(cacheKey, safeCredential, 300);
    this.logger.debug(`Credential cached for ${email}`);
  }

  async getCachedCredential(email: string): Promise<any | null> {
    const cacheKey = `credential:${email}`;
    const cached = await this.redis.getObject(cacheKey);
    
    if (cached) {
      this.logger.debug(`Credential cache hit for ${email}`);
    }
    
    return cached;
  }

  async invalidateCredentialCache(email: string): Promise<void> {
    const cacheKey = `credential:${email}`;
    await this.redis.delete(cacheKey);
    this.logger.debug(`Credential cache invalidated for ${email}`);
  }

  /**
   * Cache user role
   */
  async cacheUserRole(userUuid: string, roleType: string): Promise<void> {
    const cacheKey = `user_role:${userUuid}`;
    await this.redis.setEx(cacheKey, roleType, 300); // 5 minutes TTL
    this.logger.debug(`User role cached for ${userUuid}: ${roleType}`);
  }

  /**
   * Get cached user role
   */
  async getCachedUserRole(userUuid: string): Promise<string | null> {
    const cacheKey = `user_role:${userUuid}`;
    const role = await this.redis.get(cacheKey);
    
    if (role) {
      this.logger.debug(`User role cache HIT for ${userUuid}: ${role}`);
    }
    
    return role;
  }

  /**
   * Cache professional ID
   */
  async cacheProfessionalId(userUuid: string, professionalId: string): Promise<void> {
    const key = `professional:${userUuid}`;
    await this.redis.setEx(key, professionalId, 3600); // 1 hour cache
  }

  /**
   * Get cached professional ID
   */
  async getCachedProfessionalId(userUuid: string): Promise<string | null> {
    const key = `professional:${userUuid}`;
    return await this.redis.get(key);
  }

  /**
   * Invalidate user role cache
   */
  async invalidateUserRoleCache(userUuid: string): Promise<void> {
    const cacheKey = `user_role:${userUuid}`;
    await this.redis.delete(cacheKey);
    this.logger.debug(`User role cache invalidated for ${userUuid}`);
  }
}