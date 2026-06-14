/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';
import { StorageService } from '@pivota-api/shared-storage';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseResponseDto, MultipleEvidenceUploadResponseDto, EvidenceUploadResponseDto } from '@pivota-api/dtos';

export interface UploadedEvidenceFile {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface EvidenceFileInput {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

@Injectable()
export class ServiceExecutionMediaService {
  private readonly logger = new Logger(ServiceExecutionMediaService.name);

  constructor(
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Upload evidence files for a booking
   * @param bookingExternalId - The booking external ID (used for folder organization and lookup)
   * @param files - Array of files to upload
   * @returns BaseResponseDto with uploaded file information
   */
  async uploadEvidenceFiles(
    bookingExternalId: string,
    files: EvidenceFileInput[],
  ): Promise<BaseResponseDto<MultipleEvidenceUploadResponseDto>> {
    const uploadedFiles: UploadedEvidenceFile[] = [];
    const uploadedUrls: string[] = [];

    try {
      // Get booking details first
      const booking = await this.prisma.serviceBooking.findUnique({
        where: { externalId: bookingExternalId },
      });

      if (!booking) {
        return BaseResponseDto.fail(
          `Booking with externalId ${bookingExternalId} not found`,
          'NOT_FOUND'
        );
      }

      // ========== VALIDATE BOOKING STATUS ==========
      // Only allow evidence upload when:
      // 1. Booking is CONFIRMED (accepted but work not started) - can upload plans, before photos
      // 2. Booking is IN_PROGRESS (work ongoing) - can upload progress evidence
      // 3. Booking is COMPLETED (work done) - can upload final evidence
      
      const allowedBookingStatuses = ['CONFIRMED'];
      const allowedExecutionStatuses = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'];
      
      const isBookingStatusAllowed = allowedBookingStatuses.includes(booking.status);
      const isExecutionStatusAllowed = allowedExecutionStatuses.includes(booking.serviceExecutionStatus);
      
      if (!isBookingStatusAllowed || !isExecutionStatusAllowed) {
        let errorMessage = '';
        const errorCode = 'INVALID_STATUS';
        
        if (booking.status === 'PENDING') {
          errorMessage = `Cannot upload evidence. Booking is pending. Please wait for professional to accept the booking.`;
        } else if (booking.status === 'DECLINED') {
          errorMessage = `Cannot upload evidence. Booking was declined.`;
        } else if (booking.status === 'CANCELLED') {
          errorMessage = `Cannot upload evidence. Booking was cancelled.`;
        } else if (booking.serviceExecutionStatus === 'NOT_STARTED') {
          errorMessage = `Cannot upload evidence. Booking status is ${booking.status}. You can upload before-work photos once the professional confirms the booking.`;
        } else {
          errorMessage = `Cannot upload evidence. Booking status: ${booking.status}, Execution status: ${booking.serviceExecutionStatus}`;
        }
        
        return BaseResponseDto.fail(errorMessage, errorCode);
      }

      for (const file of files) {
        // Convert to Express.Multer.File format for StorageService
        const multerFile = {
          buffer: file.buffer,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          fieldname: 'files',
          encoding: '7bit',
          stream: null as any,
          destination: '',
          filename: '',
          path: '',
        } as Express.Multer.File;

        // Upload to Supabase storage
        const url = await this.storage.uploadFile(
          multerFile,
          `service-execution-evidence/${bookingExternalId}`,
          'pivota-public',
        );

        uploadedUrls.push(url);
        uploadedFiles.push({
          url,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
        });

        this.logger.debug(`Uploaded evidence file: ${file.originalname} for booking ${bookingExternalId}`);
      }

      // Merge new evidence with existing evidence
      const existingEvidence = booking.completionEvidence || [];
      const mergedEvidence = [...new Set([...existingEvidence, ...uploadedUrls])];

      // Update booking with new evidence URLs
      await this.prisma.serviceBooking.update({
        where: { id: booking.id },
        data: {
          completionEvidence: mergedEvidence,
          updatedAt: new Date(),
        },
      });

      // Build response items
      const items: EvidenceUploadResponseDto[] = uploadedFiles.map(f => ({
        url: f.url,
        fileName: f.fileName,
        fileSize: f.fileSize,
        mimeType: f.mimeType,
      }));

      const response: MultipleEvidenceUploadResponseDto = {
        message: `${uploadedFiles.length} evidence file(s) uploaded successfully`,
        items: items,
      };

      this.logger.log(`Evidence uploaded for booking ${bookingExternalId}. ${uploadedFiles.length} new files.`);

      return BaseResponseDto.ok(response, response.message, 'OK');

    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to upload evidence for booking ${bookingExternalId}: ${err.message}`);
      return BaseResponseDto.fail(err.message || 'Failed to upload evidence', 'INTERNAL_ERROR');
    }
  }
}