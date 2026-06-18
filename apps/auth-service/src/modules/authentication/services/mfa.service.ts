/* eslint-disable @typescript-eslint/no-explicit-any */
// apps/auth-service/src/modules/authentication/services/mfa.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { BaseResponseDto } from '@pivota-api/dtos';
import { getRateLimitConfig, QueueService, RedisService } from '@pivota-api/shared-redis';
import { ExtendedPrismaClient, PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);
  private prisma: ExtendedPrismaClient;

  constructor(
    private readonly redisService: RedisService,
    private readonly queue: QueueService,
    private readonly prismaService: PrismaService,  // ✅ Add PrismaService
  ) {
    this.prisma = this.prismaService.prisma;
  }

  /**
   * Queue OTP in background
   */
  async queueOtpInBackground(email: string, purpose: string): Promise<void> {
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    const redisKey = `otp:${purpose}:${email}`;
    await this.redisService.setEx(redisKey, otpCode, 600); // 10 minutes TTL

    this.queue.addJob(
      'authentication-email-queue',
      'send-otp',
      {
        to: email,
        email: email,
        code: otpCode,
        purpose: purpose,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: false,
      }
    ).catch(err => this.logger.error(`Failed to queue OTP email: ${err.message}`));

    this.logger.debug(`OTP ${otpCode} stored in Redis for ${email} (${purpose})`);
  }

  /**
   * Request OTP - FULL implementation from original AuthService
   */
  async requestOtp(
    dto: any // RequestOtpDto & { purpose: OtpPurpose } & { phone?: string }
  ): Promise<BaseResponseDto<null>> {
    const { email, purpose, phone } = dto;
    const startTime = Date.now();

    const config = getRateLimitConfig(purpose);
    const validation = config.validation;

    try {
      // 1. CHECK rate limit (Redis only)
      const rateLimitResult = await this.queue.checkRateLimit(
        email, 
        `otp_${purpose}`, 
        config.maxAttempts,
        config.windowSeconds
      );
      
      if (!rateLimitResult.allowed) {
        const minutesLeft = Math.ceil(rateLimitResult.resetInSeconds / 60);
        return BaseResponseDto.fail(
          config.errorMessage(minutesLeft, rateLimitResult.attempts),
          'TOO_MANY_REQUESTS'
        );
      }
      
      // 2. CHECK EXISTENCE - ONLY for EMAIL_VERIFICATION (signup)
      // For other purposes, skip DB entirely
      if (purpose === 'EMAIL_VERIFICATION') {
        // Single query for both email and phone
        const whereCondition: any = { OR: [{ email }] };
        if (phone) {
          whereCondition.OR.push({ phone });
        }
        
        const existing = await this.prisma.credential.findFirst({
          where: whereCondition,
          select: { email: true, phone: true }
        });
        
        if (existing) {
          const conflictField = existing.email === email ? 'email' : 'phone';
          const message = conflictField === 'email' 
            ? 'This email is already registered.'
            : 'This phone number is already registered.';
          
          return BaseResponseDto.fail(
            message,
            'CONFLICT',
            { code: `${conflictField.toUpperCase()}_EXISTS`, field: conflictField }
          );
        }
      }
      
      // 3. Handle other validation rules (PASSWORD_RESET, LOGIN_2FA, etc.)
      // These don't need DB queries because they're handled differently
      
      if (validation?.userExists === 'required') {
        // For password reset, we want to be fast but secure
        // Check exists but return generic message
        const userExists = await this.prisma.credential.findUnique({
          where: { email },
          select: { id: true }
        });
        
        if (!userExists && !validation.returnSuccessOnNonExistent) {
          if (validation.requireDelayOnError) {
            await this.simulateDelay();
          }
          return BaseResponseDto.fail(
            validation.customMessage?.userNotFound || 'Account not found.',
            'NOT_FOUND'
          );
        }
        
        // For password reset, always return success (security)
        if (!userExists && validation.returnSuccessOnNonExistent) {
          return BaseResponseDto.ok(
            null,
            validation.customMessage?.userNotFound || 'If an account exists, a code has been sent.'
          );
        }
      }
      
      // 4. GENERATE OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // 5. STORE IN REDIS ONLY (NO DATABASE)
      const redisKey = `otp:${purpose}:${email}`;
      await this.redisService.setEx(redisKey, otpCode, 600);
      
      // 6. INCREMENT rate limit
      await this.queue.incrementRateLimit(
        email, 
        `otp_${purpose}`, 
        config.maxAttempts,
        config.windowSeconds
      );
      
      // 7. QUEUE delivery (fire and forget)
      this.queue.addJob(
        'authentication-email-queue',
        'send-otp',
        {
          to: email,
          email: email,
          code: otpCode,
          purpose: purpose,
          phone: phone,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
        }
      ).catch(err => this.logger.error(`Failed to queue OTP: ${err.message}`));
      
      const totalTime = Date.now() - startTime;
      this.logger.log(`⚡ OTP requested in ${totalTime}ms for ${email} (${purpose})`);
      
      return BaseResponseDto.ok(null, config.successMessage || 'Verification code sent');
      
    } catch (error) {
      this.logger.error(`OTP request failed: ${error.message}`);
      return BaseResponseDto.fail('Service error', 'INTERNAL_ERROR');
    }
  }

  /**
   * Verify OTP
   */
  async verifyOtp(
    dto: any // VerifyOtpDto & { purpose: OtpPurpose }
  ): Promise<BaseResponseDto<{ verified: boolean }>> {
    const { email, code, purpose } = dto;
    const startTime = Date.now();

    try {
      // ✅ Redis ONLY - no database fallback
      const redisKey = `otp:${purpose}:${email}`;
      this.logger.debug(`🔍 Looking for OTP in Redis with key: ${redisKey}`);

      const cachedOtp = await this.redisService.get(redisKey);

      if (cachedOtp === code) {
        // Valid OTP found - delete immediately
        await this.redisService.delete(redisKey);

        const totalTime = Date.now() - startTime;
        this.logger.log(`✅ OTP verified in ${totalTime}ms for ${email}`);

        return BaseResponseDto.ok(
          { verified: true },
          'Verification successful',
          'OK'
        );
      }

      // Invalid or expired
      this.logger.warn(`❌ Invalid/expired OTP for ${email} - Expected: ${cachedOtp}, Got: ${code}`);
      return BaseResponseDto.fail(
        'Invalid or expired verification code.',
        'UNAUTHORIZED',
        { code: 'INVALID_OTP', verified: false }
      );

    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown validation error';
      this.logger.error(`Error verifying OTP for ${email}: ${errorMsg}`);

      return BaseResponseDto.fail(
        'An error occurred during verification. Please try again.',
        'INTERNAL_ERROR',
        { code: 'INTERNAL_ERROR', message: errorMsg }
      );
    }
  }

  /**
   * Helper to prevent timing attacks
   */
  private async simulateDelay(): Promise<void> {
    const delay = Math.random() * 100 + 50; // 50-150ms random delay
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}