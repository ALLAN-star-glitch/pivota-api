/* eslint-disable @typescript-eslint/no-explicit-any */
// apps/auth-service/src/modules/authentication/services/session.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ExtendedPrismaClient, PrismaService } from '../../../prisma/prisma.service';
import { RedisSessionService } from '@pivota-api/shared-redis';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private prisma: ExtendedPrismaClient;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisSession: RedisSessionService,
  ) {
    this.prisma = this.prismaService.prisma;
  }

  /**
   * Create a new session
   */
  async createSession(
    userUuid: string,
    tokenId: string,
    hashedToken: string,
    clientInfo: any,
    expiresAt: Date,
  ): Promise<void> {
    await this.prisma.session.create({
      data: {
        userUuid: userUuid,
        tokenId: tokenId,
        hashedToken: hashedToken,
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
    });

    await this.redisSession.storeSession(
      tokenId,
      userUuid,
      hashedToken,
      clientInfo,
    );

    this.logger.debug(`[AUTH] Session ${tokenId} created for User: ${userUuid}`);
  }

  /**
   * Validate a session
   */
  async validateSession(tokenId: string, refreshToken: string): Promise<boolean> {
    // 1. Try Redis first
    const session = await this.redisSession.getSession(tokenId);

    if (session) {
      const isValid = await bcrypt.compare(refreshToken, session.refreshTokenHash);
      if (isValid) {
        this.logger.debug(`Redis validation successful for ${tokenId}`);
        return true;
      }
    }

    // 2. Fallback to Database
    this.logger.debug(`Redis validation failed, checking database...`);
    const dbSession = await this.prisma.session.findUnique({
      where: { tokenId: tokenId },
      select: { hashedToken: true, revoked: true, expiresAt: true, userUuid: true }
    });

    if (dbSession && !dbSession.revoked && dbSession.expiresAt > new Date()) {
      const isValid = await bcrypt.compare(refreshToken, dbSession.hashedToken);

      if (isValid) {
        await this.redisSession.storeSession(
          tokenId,
          dbSession.userUuid,
          dbSession.hashedToken,
          null
        );
        this.logger.debug(`Session restored to Redis from database`);
        return true;
      }
    }

    return false;
  }

  /**
   * Get session by token ID
   */
  async getSession(tokenId: string): Promise<any> {
    const session = await this.redisSession.getSession(tokenId);
    if (session) {
      return session;
    }

    const dbSession = await this.prisma.session.findUnique({
      where: { tokenId: tokenId },
      select: { hashedToken: true, revoked: true, expiresAt: true, userUuid: true }
    });

    if (dbSession && !dbSession.revoked && dbSession.expiresAt > new Date()) {
      return {
        userUuid: dbSession.userUuid,
        refreshTokenHash: dbSession.hashedToken,
      };
    }

    return null;
  }

  /**
   * Revoke a session
   */
  async revokeSession(tokenId: string, userUuid: string): Promise<void> {
    await this.prisma.session.update({
      where: { tokenId: tokenId },
      data: { revoked: true },
    });

    await this.redisSession.removeSession(tokenId);
    this.logger.debug(`Session ${tokenId} revoked for user ${userUuid}`);
  }

  /**
   * Revoke all sessions for a user
   */
  async revokeAllSessions(userUuid: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userUuid: userUuid },
      data: { revoked: true },
    });

    const userSessionsKey = `user_sessions:${userUuid}`;
    await this.redisSession.deletePattern(`${userSessionsKey}:*`);
    this.logger.debug(`All sessions revoked for user ${userUuid}`);
  }

  /**
   * Rotate session (for refresh token)
   */
  async rotateSession(
    oldTokenId: string,
    newTokenId: string,
    userUuid: string,
    hashedToken: string,
  ): Promise<void> {
    await this.redisSession.rotateToken(
      oldTokenId,
      newTokenId,
      userUuid,
      hashedToken,
      null,
    );
  }

  /**
   * Get active sessions for a user
   */
  async getActiveSessions(userUuid: string): Promise<any[]> {
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

    return sessions.map((s) => ({
      id: s.id,
      tokenId: s.tokenId,
      device: s.device || 'Unknown Device',
      ipAddress: s.ipAddress || '0.0.0.0',
      userAgent: s.userAgent || 'Unknown Browser',
      os: s.os || 'Unknown OS',
      revoked: s.revoked,
      lastActiveAt: s.lastActiveAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
    }));
  }
}