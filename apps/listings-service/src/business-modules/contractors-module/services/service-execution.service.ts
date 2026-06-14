/* eslint-disable @typescript-eslint/no-inferrable-types */
import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../../../prisma/prisma.service';
import { BookingStatus } from '../../../../generated/prisma/client';
import {
  BaseResponseDto,
  SkilledProfessionalPublicProfileDto,
  UserProfileResponseDto,
  AccountResponseDto,
  StartWorkRequestDto,
  CompleteWorkRequestDto,
  GetWorkStatusRequestDto,
  CheckAutoReleaseEligibilityRequestDto,
  StartWorkResponseDto,
  CompleteWorkResponseDto,
  WorkStatusResponseDto,
  AutoReleaseEligibilityResponseDto,
} from '@pivota-api/dtos';
import { QueueService } from '@pivota-api/shared-redis';

// gRPC interface for Profile Service
interface ProfileServiceGrpc {
  getSkilledProfessionalByUuid(
    data: { uuid: string }
  ): import('rxjs').Observable<BaseResponseDto<SkilledProfessionalPublicProfileDto>>;
  
  GetUserProfileByUuid(
    data: { userUuid: string }
  ): import('rxjs').Observable<BaseResponseDto<UserProfileResponseDto>>;
  
  GetAccountByUuid(
    data: { accountUuid: string }
  ): import('rxjs').Observable<BaseResponseDto<AccountResponseDto>>;
}

@Injectable()
export class ServiceExecutionService {
  private readonly logger = new Logger(ServiceExecutionService.name);
  private profileGrpc: ProfileServiceGrpc;

  // Queue name for service execution notifications
  private readonly SERVICE_EXECUTION_QUEUE = 'service-execution-queue';

  constructor(
    private readonly prisma: PrismaService,
    @Inject('PROFILE_GRPC') private readonly profileGrpcClient: ClientGrpc,
    private readonly queue: QueueService,
  ) {
    this.profileGrpc = this.profileGrpcClient.getService<ProfileServiceGrpc>('ProfileService');
  }

  // ==================== HELPER METHODS ====================

  private async getSkilledProfessionalDetails(skilledProfessionalId: string): Promise<SkilledProfessionalPublicProfileDto | null> {
    try {
      const response = await firstValueFrom(
        this.profileGrpc.getSkilledProfessionalByUuid({ uuid: skilledProfessionalId })
      );
      
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      this.logger.warn(`Failed to fetch professional details for ${skilledProfessionalId}: ${error.message}`);
      return null;
    }
  }

  private async getUserDetails(userUuid: string): Promise<{
    uuid: string;
    displayName: string;
    email: string;
    phone: string;
    accountUuid: string;
  } | null> {
    try {
      const response = await firstValueFrom(
        this.profileGrpc.GetUserProfileByUuid({ userUuid })
      );
      
      if (response.success && response.data) {
        const userData = response.data.user;
        const accountData = response.data.account;
        
        return {
          uuid: userData?.uuid || response.data.user?.uuid,
          displayName: userData?.firstName
            ? `${userData.firstName} ${userData.lastName || ''}`.trim()
            : userData?.email || '',
          email: userData?.email || '',
          phone: userData?.phone || '',
          accountUuid: accountData?.uuid || '',
        };
      }
      return null;
    } catch (error) {
      this.logger.warn(`Failed to fetch user details for ${userUuid}: ${error.message}`);
      return null;
    }
  }

  private async getBookingByExternalId(bookingExternalId: string) {
    const booking = await this.prisma.serviceBooking.findUnique({
      where: { externalId: bookingExternalId },
      include: {
        service: {
          include: {
            category: true,
          },
        },
      },
    });

    return booking;
  }

  // ==================== START WORK ====================

  async startWork(
    dto: StartWorkRequestDto,
  ): Promise<BaseResponseDto<StartWorkResponseDto>> {
    try {
      const { bookingExternalId, professionalId, isPlatformAdmin } = dto;

      const booking = await this.getBookingByExternalId(bookingExternalId);

      if (!booking) {
        return BaseResponseDto.fail(
          `Booking with externalId ${bookingExternalId} not found`,
          'NOT_FOUND'
        );
      }

      if (!isPlatformAdmin && booking.contractorId !== professionalId) {
        return BaseResponseDto.fail(
          'Unauthorized: This booking belongs to another professional',
          'FORBIDDEN'
        );
      }

      if (booking.status !== BookingStatus.CONFIRMED) {
        return BaseResponseDto.fail(
          `Cannot start work when booking status is ${booking.status}. Booking must be CONFIRMED.`,
          'INVALID_STATUS'
        );
      }

      if (booking.serviceExecutionStatus !== 'NOT_STARTED') {
        return BaseResponseDto.fail(
          `Cannot start work when service execution status is ${booking.serviceExecutionStatus}. Current status must be NOT_STARTED.`,
          'INVALID_STATUS'
        );
      }

      const updatedBooking = await this.prisma.serviceBooking.update({
        where: { id: booking.id },
        data: {
          serviceExecutionStatus: 'IN_PROGRESS',
          workStartedAt: new Date(),
          updatedAt: new Date(),
        },
        include: {
          service: {
            include: {
              category: true,
            },
          },
        },
      });

      this.logger.log(`Work started for booking ${bookingExternalId} by professional ${professionalId}`);

      // Add job to queue instead of direct emit
      await this.queue.addJob(
        this.SERVICE_EXECUTION_QUEUE,
        'service.started',
        {
          customerEmail: booking.clientEmail,
          customerName: booking.clientName,
          customerPhone: booking.clientPhone,
          contractorEmail: booking.contractorEmail,
          contractorName: booking.contractorName,
          contractorPhone: booking.contractorPhone,
          serviceTitle: booking.serviceTitle,
          scheduledDate: booking.scheduledDate,
          location: booking.locationCity,
          startedAt: new Date().toISOString(),
          bookingExternalId: booking.externalId,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
        }
      );

      const response: StartWorkResponseDto = {
        id: updatedBooking.id,
        externalId: updatedBooking.externalId,
        serviceExecutionStatus: updatedBooking.serviceExecutionStatus,
        workStartedAt: updatedBooking.workStartedAt,
        status: updatedBooking.status,
      };

      return BaseResponseDto.ok(
        response,
        'Work started successfully, status set to IN_PROGRESS, and notification sent to customer',
        'OK'
      );

    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to start work: ${err.message}`);
      return BaseResponseDto.fail(err.message || 'Failed to start work', 'INTERNAL_ERROR');
    }
  }

  // ==================== COMPLETE WORK ====================

  async completeWork(
    dto: CompleteWorkRequestDto,
  ): Promise<BaseResponseDto<CompleteWorkResponseDto>> {
    try {
      const { bookingExternalId, professionalId, evidenceUrls = [], isPlatformAdmin } = dto;

      const booking = await this.getBookingByExternalId(bookingExternalId);

      if (!booking) {
        return BaseResponseDto.fail(
          `Booking with externalId ${bookingExternalId} not found`,
          'NOT_FOUND'
        );
      }

      if (!isPlatformAdmin && booking.contractorId !== professionalId) {
        return BaseResponseDto.fail(
          'Unauthorized: This booking belongs to another professional',
          'FORBIDDEN'
        );
      }

      if (booking.status !== BookingStatus.CONFIRMED) {
        return BaseResponseDto.fail(
          `Cannot complete work when booking status is ${booking.status}. Booking must be CONFIRMED.`,
          'INVALID_STATUS'
        );
      }

      if (booking.serviceExecutionStatus !== 'IN_PROGRESS') {
        return BaseResponseDto.fail(
          `Cannot complete work when service execution status is ${booking.serviceExecutionStatus}. Current status must be IN_PROGRESS.`,
          'INVALID_STATUS'
        );
      }

      // Calculate auto-release date (48 hours from now)
      const autoReleaseAt = new Date();
      autoReleaseAt.setHours(autoReleaseAt.getHours() + 48);

      const updatedBooking = await this.prisma.serviceBooking.update({
        where: { id: booking.id },
        data: {
          serviceExecutionStatus: 'COMPLETED',
          workCompletedAt: new Date(),
          autoReleaseAt: autoReleaseAt,
          completionEvidence: evidenceUrls,
          updatedAt: new Date(),
        },
        include: {
          service: {
            include: {
              category: true,
            },
          },
        },
      });

      this.logger.log(`Work completed for booking ${bookingExternalId} by professional ${professionalId}. Auto-release set for ${autoReleaseAt.toISOString()}`);

      // Add job to queue instead of direct emit
      await this.queue.addJob(
        this.SERVICE_EXECUTION_QUEUE,
        'service.completed',
        {
          customerEmail: booking.clientEmail,
          customerName: booking.clientName,
          customerPhone: booking.clientPhone,
          contractorEmail: booking.contractorEmail,
          contractorName: booking.contractorName,
          contractorPhone: booking.contractorPhone,
          serviceTitle: booking.serviceTitle,
          scheduledDate: booking.scheduledDate,
          location: booking.locationCity,
          completedAt: new Date().toISOString(),
          autoReleaseAt: autoReleaseAt.toISOString(),
          autoReleaseHours: 48,
          bookingExternalId: booking.externalId,
          evidenceUrls: evidenceUrls,
          servicePrice: booking.servicePrice,
          totalAmount: booking.totalAmount,
          currency: booking.currency,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
        }
      );

      const response: CompleteWorkResponseDto = {
        id: updatedBooking.id,
        externalId: updatedBooking.externalId,
        serviceExecutionStatus: updatedBooking.serviceExecutionStatus,
        workCompletedAt: updatedBooking.workCompletedAt,
        autoReleaseAt: updatedBooking.autoReleaseAt,
        completionEvidence: updatedBooking.completionEvidence,
        status: updatedBooking.status,
      };

      return BaseResponseDto.ok(
        response,
        'Work completed successfully. Waiting for customer confirmation.',
        'OK'
      );

    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to complete work: ${err.message}`);
      return BaseResponseDto.fail(err.message || 'Failed to complete work', 'INTERNAL_ERROR');
    }
  }

  // ==================== GET WORK STATUS ====================

  async getWorkStatus(
    dto: GetWorkStatusRequestDto,
  ): Promise<BaseResponseDto<WorkStatusResponseDto>> {
    try {
      const { bookingExternalId, userId, isPlatformAdmin } = dto;

      const booking = await this.getBookingByExternalId(bookingExternalId);

      if (!booking) {
        return BaseResponseDto.fail(
          `Booking with externalId ${bookingExternalId} not found`,
          'NOT_FOUND'
        );
      }

      // Check authorization
      if (!isPlatformAdmin && booking.clientId !== userId && booking.contractorId !== userId) {
        return BaseResponseDto.fail(
          'Unauthorized to view this booking',
          'FORBIDDEN'
        );
      }

      const professionalDetails = booking.contractorId
        ? await this.getSkilledProfessionalDetails(booking.contractorId)
        : null;

      const response: WorkStatusResponseDto = {
        id: booking.id,
        externalId: booking.externalId,
        serviceExecutionStatus: booking.serviceExecutionStatus,
        workStartedAt: booking.workStartedAt,
        workCompletedAt: booking.workCompletedAt,
        autoReleaseAt: booking.autoReleaseAt,
        autoReleaseTriggered: booking.autoReleaseTriggered,
        completionEvidence: booking.completionEvidence,
        customerSatisfaction: booking.customerSatisfaction,
        customerConfirmedAt: booking.customerConfirmedAt,
        paymentReleasedAt: booking.paymentReleasedAt,
        professionalName: booking.contractorName,
        professionalIsVerified: professionalDetails?.isVerified || false,
      };

      return BaseResponseDto.ok(
        response,
        'Work status retrieved successfully',
        'OK'
      );

    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to get work status: ${err.message}`);
      return BaseResponseDto.fail(err.message || 'Failed to get work status', 'INTERNAL_ERROR');
    }
  }

  // ==================== CHECK IF AUTO-RELEASE IS DUE ====================

  async checkAutoReleaseEligible(
    dto: CheckAutoReleaseEligibilityRequestDto,
  ): Promise<BaseResponseDto<AutoReleaseEligibilityResponseDto>> {
    try {
      const { bookingExternalId } = dto;

      const booking = await this.getBookingByExternalId(bookingExternalId);

      if (!booking) {
        return BaseResponseDto.fail(
          `Booking with externalId ${bookingExternalId} not found`,
          'NOT_FOUND'
        );
      }

      const isEligible = 
        booking.serviceExecutionStatus === 'COMPLETED' &&
        booking.customerSatisfaction === 'PENDING' &&
        booking.autoReleaseAt !== null &&
        booking.autoReleaseAt <= new Date() &&
        booking.autoReleaseTriggered === false &&
        booking.paymentReleasedAt === null;

      const response: AutoReleaseEligibilityResponseDto = {
        isEligible: isEligible,
        autoReleaseAt: booking.autoReleaseAt,
      };

      return BaseResponseDto.ok(
        response,
        isEligible ? 'Booking is eligible for auto-release' : 'Booking is not eligible for auto-release',
        'OK'
      );

    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to check auto-release eligibility: ${err.message}`);
      return BaseResponseDto.fail(err.message, 'INTERNAL_ERROR');
    }
  }
}