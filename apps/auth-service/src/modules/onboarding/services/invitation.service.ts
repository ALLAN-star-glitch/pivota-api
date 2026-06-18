// apps/auth-service/src/modules/onboarding/services/invitation.service.ts
import { Injectable, Logger, Inject } from '@nestjs/common';
import { ExtendedPrismaClient, PrismaService } from '../../../prisma/prisma.service';
import { ClientProxy } from '@nestjs/microservices';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { BaseResponseDto } from '@pivota-api/dtos';
import { QueueService, RedisSessionService } from '@pivota-api/shared-redis';

@Injectable()
export class InvitationService {
  private readonly logger = new Logger(InvitationService.name);
  private prisma: ExtendedPrismaClient;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly queue: QueueService,
    private readonly redisSession: RedisSessionService,
    @Inject('NOTIFICATION_EVENT_BUS') private readonly notificationBus: ClientProxy,
  ) {
    this.prisma = this.prismaService.prisma;
  }

  /**
   * Handle invitation accepted for a NEW user
   * Creates credentials and password setup token
   */
  async handleInvitationAcceptedNewUser(data: {
    email: string;
    userUuid: string;
    accountUuid: string;
    organizationUuid: string;
    organizationName: string;
    roleName: string;
    firstName: string;
    lastName: string;
    phone: string;
  }): Promise<void> {
    this.logger.log(`[INVITE] Creating credentials for new user: ${data.email}`);

    try {
      // 1. Check if credentials already exist
      const existingCredential = await this.prisma.credential.findUnique({
        where: { email: data.email }
      });

      if (existingCredential) {
        this.logger.warn(`[INVITE] Credentials already exist for ${data.email}`);
        
        // If credential exists but doesn't have member status for this org, update it
        if (!existingCredential.memberStatus) {
          await this.prisma.credential.update({
            where: { id: existingCredential.id },
            data: { 
              memberStatus: 'ACTIVE',
              accountUuid: data.accountUuid
            }
          });
          this.logger.log(`[INVITE] Updated existing credential with member status for ${data.email}`);
        }
        return;
      }

      // 2. Generate a password setup token (48 hour expiry)
      const setupToken = randomUUID();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48);

      // 3. Create credential record with organization context
      await this.prisma.credential.create({
        data: {
          userUuid: data.userUuid,
          accountUuid: data.accountUuid,
          email: data.email,
          phone: data.phone || null,
          passwordHash: null, // No password yet (will be set via setup)
          mfaEnabled: true,
          failedAttempts: 0,
          lastLoginAt: null,
          accountStatus: 'ACTIVE',
          memberStatus: 'ACTIVE',
        },
      });

      // 4. Create password setup token
      await this.prisma.passwordSetupToken.create({
        data: {
          userUuid: data.userUuid,
          token: setupToken,
          expiresAt,
          used: false,
        },
      });

      // 5. Create audit record
      await this.prisma.invitationAudit.create({
        data: {
          email: data.email,
          userUuid: data.userUuid,
          organizationUuid: data.organizationUuid,
          invitedByUserUuid: 'system',
          status: 'ACCEPTED',
          acceptedAt: new Date(),
        },
      });

      // 6. Emit event to send password setup email
      this.notificationBus.emit('user.password.setup.required', {
        email: data.email,
        userUuid: data.userUuid,
        firstName: data.firstName,
        lastName: data.lastName,
        setupToken,
        expiresAt: expiresAt.toISOString(),
        organizationName: data.organizationName,
        organizationUuid: data.organizationUuid,
      });

      this.logger.log(`[INVITE] Password setup token created for ${data.email} (Organization: ${data.organizationName})`);

    } catch (error) {
      this.logger.error(`[INVITE] Failed to create credentials for ${data.email}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle invitation accepted for an EXISTING user
   * Updates their member status and sends notification
   */
  async handleInvitationAcceptedExistingUser(data: {
    email: string;
    userUuid: string;
    accountUuid: string;
    organizationUuid: string;
    organizationName: string;
    roleName: string;
  }): Promise<void> {
    this.logger.log(`[INVITE] Updating existing user for invitation: ${data.email}`);

    try {
      // 1. Check if credential exists
      const existingCredential = await this.prisma.credential.findUnique({
        where: { email: data.email }
      });

      if (!existingCredential) {
        this.logger.error(`[INVITE] User not found: ${data.email}`);
        throw new Error(`User not found: ${data.email}`);
      }

      // 2. Update member status
      await this.prisma.credential.update({
        where: { id: existingCredential.id },
        data: {
          memberStatus: 'ACTIVE',
          accountUuid: data.accountUuid,
        },
      });

      // 3. Create audit record
      await this.prisma.invitationAudit.create({
        data: {
          email: data.email,
          userUuid: data.userUuid,
          organizationUuid: data.organizationUuid,
          invitedByUserUuid: 'system',
          status: 'ACCEPTED',
          acceptedAt: new Date(),
        },
      });

      // 4. Send notification
      this.notificationBus.emit('user.invitation.accepted', {
        email: data.email,
        userUuid: data.userUuid,
        organizationName: data.organizationName,
        organizationUuid: data.organizationUuid,
        roleName: data.roleName,
      });

      this.logger.log(`[INVITE] Updated existing user ${data.email} with member status for organization ${data.organizationName}`);

    } catch (error) {
      this.logger.error(`[INVITE] Failed to update existing user ${data.email}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create invited user credentials (gRPC endpoint)
   */
  async createInvitedUserCredentials(data: {
    email: string;
    userUuid: string;
    accountUuid: string;
    firstName: string;
    lastName: string;
    phone: string;
    organizationName: string;
    organizationUuid: string;
    roleName: string;
  }): Promise<BaseResponseDto<null>> {
    this.logger.log(`[gRPC] Creating credentials for invited user: ${data.email} (Organization: ${data.organizationName})`);
    
    try {
      await this.handleInvitationAcceptedNewUser({
        email: data.email,
        userUuid: data.userUuid,
        accountUuid: data.accountUuid,
        organizationUuid: data.organizationUuid,
        organizationName: data.organizationName,
        roleName: data.roleName,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      });
      
      return BaseResponseDto.ok(null, 'Credentials created successfully', 'OK');
    } catch (error) {
      this.logger.error(`[gRPC] Failed to create credentials for invited user: ${error.message}`);
      return BaseResponseDto.fail(error.message, 'INTERNAL_ERROR');
    }
  }

  /**
   * Check password setup status
   */
  async checkPasswordSetupStatus(token: string): Promise<BaseResponseDto<{
    isValid: boolean;
    email?: string;
    expiresAt?: string;
  }>> {
    this.logger.log(`[INVITE] Checking password setup token: ${token}`);

    try {
      const tokenRecord = await this.prisma.passwordSetupToken.findFirst({
        where: {
          token,
          used: false,
          expiresAt: { gt: new Date() }
        },
        include: {
          credential: {
            select: { email: true }
          }
        }
      });

      if (!tokenRecord) {
        return BaseResponseDto.ok(
          { isValid: false },
          'Token is invalid or expired',
          'OK'
        );
      }

      return BaseResponseDto.ok(
        {
          isValid: true,
          email: tokenRecord.credential.email,
          expiresAt: tokenRecord.expiresAt.toISOString()
        },
        'Token is valid',
        'OK'
      );

    } catch (error) {
      this.logger.error(`[INVITE] Status check failed: ${error.message}`);
      return BaseResponseDto.fail('Failed to check token status', 'INTERNAL_ERROR');
    }
  }

  /**
   * Resend password setup email
   */
  async resendPasswordSetupEmail(email: string): Promise<BaseResponseDto<null>> {
    this.logger.log(`[INVITE] Resending password setup email to: ${email}`);

    try {
      const credential = await this.prisma.credential.findUnique({
        where: { email },
        include: {
          passwordSetupTokens: {
            where: { used: false, expiresAt: { gt: new Date() } },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });

      if (!credential) {
        return BaseResponseDto.fail('User not found', 'NOT_FOUND');
      }

      let setupToken = credential.passwordSetupTokens[0]?.token;

      if (!setupToken) {
        setupToken = randomUUID();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 48);

        await this.prisma.passwordSetupToken.create({
          data: {
            userUuid: credential.userUuid,
            token: setupToken,
            expiresAt,
            used: false,
          }
        });
      }

      // Get user details (firstName, lastName from profile service would be ideal)
      // For now, use placeholder
      this.notificationBus.emit('user.password.setup.required', {
        email: credential.email,
        userUuid: credential.userUuid,
        firstName: 'User', // Should fetch from profile service
        setupToken,
        organizationName: 'Your Organization'
      });

      return BaseResponseDto.ok(null, 'Password setup email sent', 'OK');

    } catch (error) {
      this.logger.error(`[INVITE] Resend failed: ${error.message}`);
      return BaseResponseDto.fail('Failed to resend email', 'INTERNAL_ERROR');
    }
  }

  /**
   * Setup password for invited user
   */
  async setupPassword(
    token: string,
    password: string,
    confirmPassword: string
  ): Promise<BaseResponseDto<null>> {
    this.logger.log(`[INVITE] Setting up password for token: ${token}`);

    try {
      // 1. Validate password confirmation
      if (password !== confirmPassword) {
        return BaseResponseDto.fail('Passwords do not match', 'BAD_REQUEST');
      }

      // 2. Find valid token
      const tokenRecord = await this.prisma.passwordSetupToken.findFirst({
        where: {
          token,
          used: false,
          expiresAt: { gt: new Date() }
        },
        include: {
          credential: true
        }
      });

      if (!tokenRecord) {
        return BaseResponseDto.fail('Invalid or expired password setup token', 'NOT_FOUND');
      }

      // 3. Hash the new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // 4. Update in transaction
      await this.prisma.$transaction(async (tx) => {
        // Update credential with password
        await tx.credential.update({
          where: { userUuid: tokenRecord.userUuid },
          data: { 
            passwordHash: hashedPassword,
            updatedAt: new Date()
          }
        });

        // Mark token as used
        await tx.passwordSetupToken.update({
          where: { id: tokenRecord.id },
          data: { used: true }
        });
      });

      // 5. Notify that password is set
      this.notificationBus.emit('user.password.setup.completed', {
        email: tokenRecord.credential.email,
        userUuid: tokenRecord.userUuid
      });

      this.logger.log(`[INVITE] Password setup completed for user: ${tokenRecord.credential.email}`);

      return BaseResponseDto.ok(null, 'Password set successfully. You can now login.', 'OK');

    } catch (error) {
      this.logger.error(`[INVITE] Password setup failed: ${error.message}`);
      return BaseResponseDto.fail('Failed to set password', 'INTERNAL_ERROR');
    }
  }
}