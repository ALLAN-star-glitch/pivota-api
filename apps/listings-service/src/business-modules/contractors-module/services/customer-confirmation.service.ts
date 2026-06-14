
import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  BaseResponseDto,
  SkilledProfessionalPublicProfileDto,
  UserProfileResponseDto,
  AccountResponseDto,
  ConfirmSatisfactionRequestDto,
  ReportDissatisfactionRequestDto,
  ConfirmSatisfactionResponseDto,
  ReportDissatisfactionResponseDto,
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
export class CustomerConfirmationService {
  private readonly logger = new Logger(CustomerConfirmationService.name);
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

  // ==================== CONFIRM SATISFACTION ====================

  async confirmSatisfaction(
    dto: ConfirmSatisfactionRequestDto,
  ): Promise<BaseResponseDto<ConfirmSatisfactionResponseDto>> {
    try {
      const { bookingExternalId, customerId, isPlatformAdmin } = dto;

      const booking = await this.getBookingByExternalId(bookingExternalId);

      if (!booking) {
        return BaseResponseDto.fail(
          `Booking with externalId ${bookingExternalId} not found`,
          'NOT_FOUND'
        );
      }

      // Check authorization
      if (!isPlatformAdmin && booking.clientId !== customerId) {
        return BaseResponseDto.fail(
          'Unauthorized: Only the customer who booked this service can confirm satisfaction',
          'FORBIDDEN'
        );
      }

      // Validate booking can be confirmed
      if (booking.serviceExecutionStatus !== 'COMPLETED') {
        return BaseResponseDto.fail(
          `Cannot confirm satisfaction when service execution status is ${booking.serviceExecutionStatus}. Work must be COMPLETED first.`,
          'INVALID_STATUS'
        );
      }

      if (booking.customerSatisfaction !== 'PENDING') {
        return BaseResponseDto.fail(
          `Cannot confirm satisfaction when customer satisfaction status is ${booking.customerSatisfaction}. Already processed.`,
          'INVALID_STATUS'
        );
      }

      // Calculate amount to release (total amount minus platform commission)
      const platformCommissionPercentage = 5; // 5%
      const platformCommissionAmount = (booking.totalAmount || 0) * platformCommissionPercentage / 100;
      const amountReleased = (booking.totalAmount || 0) - platformCommissionAmount;

      // Update booking
      const updatedBooking = await this.prisma.serviceBooking.update({
        where: { id: booking.id },
        data: {
          customerSatisfaction: 'SATISFIED',
          customerConfirmedAt: new Date(),
          paymentReleasedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Customer confirmed satisfaction for booking ${bookingExternalId} by customer ${customerId}`);

      // Fetch fresh user details if denormalized fields are missing
      let customerEmail = booking.clientEmail;
      let customerName = booking.clientName;
      let customerPhone = booking.clientPhone;
      let contractorEmail = booking.contractorEmail;
      let contractorName = booking.contractorName;
      let contractorPhone = booking.contractorPhone;

      if (!customerEmail || !customerName) {
        const userDetails = await this.getUserDetails(customerId);
        if (userDetails) {
          customerEmail = userDetails.email;
          customerName = userDetails.displayName;
          customerPhone = userDetails.phone;
        }
      }

      if (!contractorEmail || !contractorName) {
        const contractorDetails = await this.getSkilledProfessionalDetails(booking.contractorId);
        if (contractorDetails) {
          contractorEmail = contractorDetails.email;
          contractorName = contractorDetails.displayName || contractorDetails.title;
          contractorPhone = contractorDetails.phone;
        }
      }

      // Send notification to service execution queue
      await this.queue.addJob(
        this.SERVICE_EXECUTION_QUEUE,
        'customer.confirmed',
        {
          customerEmail: customerEmail,
          customerName: customerName,
          customerPhone: customerPhone,
          contractorEmail: contractorEmail,
          contractorName: contractorName,
          contractorPhone: contractorPhone,
          serviceTitle: booking.serviceTitle,
          scheduledDate: booking.scheduledDate,
          location: booking.locationCity,
          confirmedAt: new Date().toISOString(),
          paymentReleasedAt: new Date().toISOString(),
          servicePrice: booking.servicePrice,
          totalAmount: booking.totalAmount,
          currency: booking.currency,
          bookingExternalId: booking.externalId,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
        }
      );

      const response: ConfirmSatisfactionResponseDto = {
        id: updatedBooking.id,
        externalId: updatedBooking.externalId,
        customerSatisfaction: updatedBooking.customerSatisfaction,
        customerConfirmedAt: updatedBooking.customerConfirmedAt,
        paymentReleasedAt: updatedBooking.paymentReleasedAt,
        amountReleased: `${amountReleased.toLocaleString()} ${booking.currency}`,
        bookingStatus: updatedBooking.status,
      };

      return BaseResponseDto.ok(
        response,
        'Service confirmed successfully. Payment has been released to the professional.',
        'OK'
      );

    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to confirm satisfaction: ${err.message}`);
      return BaseResponseDto.fail(err.message || 'Failed to confirm satisfaction', 'INTERNAL_ERROR');
    }
  }

  // ==================== REPORT DISSATISFACTION ====================

  async reportDissatisfaction(
    dto: ReportDissatisfactionRequestDto,
  ): Promise<BaseResponseDto<ReportDissatisfactionResponseDto>> {
    try {
      const { bookingExternalId, customerId, isPlatformAdmin, reason, description, evidenceUrls } = dto;

      const booking = await this.getBookingByExternalId(bookingExternalId);

      if (!booking) {
        return BaseResponseDto.fail(
          `Booking with externalId ${bookingExternalId} not found`,
          'NOT_FOUND'
        );
      }

      // Check authorization
      if (!isPlatformAdmin && booking.clientId !== customerId) {
        return BaseResponseDto.fail(
          'Unauthorized: Only the customer who booked this service can report dissatisfaction',
          'FORBIDDEN'
        );
      }

      // Validate booking can be disputed
      if (booking.serviceExecutionStatus !== 'COMPLETED') {
        return BaseResponseDto.fail(
          `Cannot report dissatisfaction when service execution status is ${booking.serviceExecutionStatus}. Work must be COMPLETED first.`,
          'INVALID_STATUS'
        );
      }

      if (booking.customerSatisfaction !== 'PENDING') {
        return BaseResponseDto.fail(
          `Cannot report dissatisfaction when customer satisfaction status is ${booking.customerSatisfaction}. Already processed.`,
          'INVALID_STATUS'
        );
      }

      // Update booking customer satisfaction
      const updatedBooking = await this.prisma.serviceBooking.update({
        where: { id: booking.id },
        data: {
          customerSatisfaction: 'DISSATISFIED',
          customerDissatisfiedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Create dispute record
      const dispute = await this.prisma.dispute.create({
        data: {
          bookingId: booking.id,
          raisedBy: 'CUSTOMER',
          raisedByUserId: customerId,
          title: reason,
          description: description || '',
          reason: 'POOR_WORK',
          evidenceUrls: evidenceUrls || [],
          status: 'UNDER_REVIEW',
        },
      });

      // Update booking with active dispute ID
      await this.prisma.serviceBooking.update({
        where: { id: booking.id },
        data: {
          activeDisputeId: dispute.id,
        },
      });

      this.logger.log(`Customer reported dissatisfaction for booking ${bookingExternalId}. Dispute created: ${dispute.id}`);

      // Fetch fresh user details if denormalized fields are missing
      let customerEmail = booking.clientEmail;
      let customerName = booking.clientName;
      let customerPhone = booking.clientPhone;
      let contractorEmail = booking.contractorEmail;
      let contractorName = booking.contractorName;
      let contractorPhone = booking.contractorPhone;

      if (!customerEmail || !customerName) {
        const userDetails = await this.getUserDetails(customerId);
        if (userDetails) {
          customerEmail = userDetails.email;
          customerName = userDetails.displayName;
          customerPhone = userDetails.phone;
        }
      }

      if (!contractorEmail || !contractorName) {
        const contractorDetails = await this.getSkilledProfessionalDetails(booking.contractorId);
        if (contractorDetails) {
          contractorEmail = contractorDetails.email;
          contractorName = contractorDetails.displayName || contractorDetails.title;
          contractorPhone = contractorDetails.phone;
        }
      }

      // Send notification to service execution queue
      await this.queue.addJob(
        this.SERVICE_EXECUTION_QUEUE,
        'customer.dissatisfied',
        {
          customerEmail: customerEmail,
          customerName: customerName,
          customerPhone: customerPhone,
          contractorEmail: contractorEmail,
          contractorName: contractorName,
          contractorPhone: contractorPhone,
          serviceTitle: booking.serviceTitle,
          scheduledDate: booking.scheduledDate,
          location: booking.locationCity,
          dissatisfiedAt: new Date().toISOString(),
          bookingExternalId: booking.externalId,
          disputeId: dispute.id,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
        }
      );

      const response: ReportDissatisfactionResponseDto = {
        id: updatedBooking.id,
        externalId: updatedBooking.externalId,
        customerSatisfaction: updatedBooking.customerSatisfaction,
        customerDissatisfiedAt: updatedBooking.customerDissatisfiedAt,
        disputeId: dispute.id,
        disputeStatus: dispute.status,
        bookingStatus: updatedBooking.status,
      };

      return BaseResponseDto.ok(
        response,
        'We have received your report. A dispute has been created and our team will review it within 5 business days.',
        'OK'
      );

    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to report dissatisfaction: ${err.message}`);
      return BaseResponseDto.fail(err.message || 'Failed to report dissatisfaction', 'INTERNAL_ERROR');
    }
  }
}