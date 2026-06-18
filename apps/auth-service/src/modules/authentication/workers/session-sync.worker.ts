/* eslint-disable @typescript-eslint/no-explicit-any */
// apps/auth-service/src/workers/session-sync.worker.ts
console.log('🔥 SESSION SYNC WORKER FILE IS BEING LOADED');
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueueService } from '@pivota-api/shared-redis';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class SessionSyncWorker implements OnModuleInit {
  private readonly logger = new Logger(SessionSyncWorker.name);
  private initialized = false;

  constructor(
    private queue: QueueService,
    private readonly prismaService: PrismaService,
  ) {
    console.log('🔥 SessionSyncWorker CONSTRUCTOR called');
  }

  async onModuleInit() {
    console.log('🔥 SessionSyncWorker.onModuleInit() called');
    await this.initialize();
  }

  async initialize() {
    if (this.initialized) {
      console.log('🔥 SessionSyncWorker already initialized, skipping');
      return;
    }
    
    console.log('🔥 SessionSyncWorker.initialize() STARTED');
    this.logger.log('🔄 Initializing session sync worker...');
    
    try {
      this.queue.createWorker('db-sync', async (job) => {
        const { name, data } = job;
        
        this.logger.log(`🔄 Processing session sync job: ${name}`);
        
        try {
          // Handle revoke-all-sessions (no tokenId)
          if (name === 'revoke-all-sessions') {
            const { userUuid } = data;
            this.logger.debug(`Revoking ALL sessions for user: ${userUuid}`);
            
            await this.prismaService.prisma.session.updateMany({
              where: { 
                userUuid: userUuid,
                revoked: false 
              },
              data: { revoked: true }
            });
            
            this.logger.log(`✅ All sessions revoked for user: ${userUuid}`);
            return;
          }
          
          // Handle revoke-session (specific tokenId)
          if (name === 'revoke-session') {
            const { oldTokenId, tokenId, userUuid } = data;
            const targetTokenId = oldTokenId || tokenId;
            
            if (!targetTokenId) {
              this.logger.error(`No tokenId provided for revoke-session job`);
              return;
            }
            
            this.logger.debug(`Revoking session: ${targetTokenId} for user: ${userUuid}`);
            
            await this.prismaService.prisma.session.updateMany({
              where: { tokenId: targetTokenId },
              data: { revoked: true }
            });
            
            this.logger.log(`✅ Session revoked: ${targetTokenId}`);
            return;
          }
          
          // Handle session-rotation (token rotation)
          if (name === 'session-rotation') {
            const { oldTokenId, newTokenId, userUuid, newRefreshTokenHash, clientInfo, timestamp } = data;
            
            this.logger.debug(`Processing session rotation for user: ${userUuid}`);
            
            await this.prismaService.prisma.$transaction(async (tx) => {
              // Mark old session as revoked
              if (oldTokenId) {
                await tx.session.updateMany({
                  where: { tokenId: oldTokenId },
                  data: { revoked: true }
                });
              }
              
              // Check if new session already exists (idempotency)
              const existingSession = await tx.session.findUnique({
                where: { tokenId: newTokenId }
              });
              
              if (!existingSession) {
                // Create new session
                await tx.session.create({
                  data: {
                    userUuid,
                    tokenId: newTokenId,
                    hashedToken: newRefreshTokenHash,
                    device: clientInfo?.device || 'rotated',
                    ipAddress: clientInfo?.ipAddress,
                    userAgent: clientInfo?.userAgent,
                    os: clientInfo?.os,
                    deviceType: clientInfo?.deviceType,
                    osVersion: clientInfo?.osVersion,
                    browser: clientInfo?.browser,
                    browserVersion: clientInfo?.browserVersion,
                    isBot: clientInfo?.isBot,
                    lastActiveAt: new Date(timestamp),
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    revoked: false,
                  }
                });
              }
              
              // Update credential last active
              await tx.credential.update({
                where: { userUuid },
                data: { lastLoginAt: new Date(timestamp) }
              });
            });
            
            this.logger.log(`✅ DB sync completed: ${oldTokenId} -> ${newTokenId}`);
            return;
          }
          
          // Handle create-session (new session from login)
          if (name === 'create-session') {
            const { tokenId, userUuid, hashedToken, clientInfo, expiresAt } = data;
            
            this.logger.debug(`Creating session for user: ${userUuid}`);
            
            await this.prismaService.prisma.session.create({
              data: {
                userUuid,
                tokenId,
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
                expiresAt: new Date(expiresAt),
                revoked: false,
              }
            });
            
            this.logger.log(`✅ Session created: ${tokenId}`);
            return;
          }
          
          this.logger.warn(`Unknown job type: ${name}`);
          
        } catch (error: any) {
          this.logger.error(`❌ Session sync job ${name} failed: ${error.message}`);
          throw error;
        }
      });
      
      this.initialized = true;
      this.logger.log('✅ Session sync worker initialized and ready');
      console.log('🔥 SessionSyncWorker.initialize() COMPLETED SUCCESSFULLY');
      
    } catch (error) {
      console.error('🔥 SessionSyncWorker.initialize() FAILED:', error);
      this.logger.error(`Failed to initialize session sync worker: ${error.message}`);
      throw error;
    }
  }
}