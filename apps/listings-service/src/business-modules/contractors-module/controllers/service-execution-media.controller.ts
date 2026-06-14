/* eslint-disable @typescript-eslint/no-explicit-any */
import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod, Payload, RpcException } from '@nestjs/microservices';
import { ServiceExecutionMediaService, EvidenceFileInput } from '../services/service-execution-media.service';
import { BaseResponseDto, MultipleEvidenceUploadResponseDto } from '@pivota-api/dtos';

// Define the gRPC request interface for evidence file upload
interface UploadEvidenceFilesGrpcRequest {
  bookingExternalId: string;
  files: Array<{
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  }>;
  professionalId: string;
  isPlatformAdmin: boolean;
}

// Helper function to convert gRPC file to EvidenceFileInput
function toEvidenceFileInput(file: {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}): EvidenceFileInput {
  return {
    buffer: file.buffer,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
  };
}

@Controller()
export class ServiceExecutionMediaController {
  private readonly logger = new Logger(ServiceExecutionMediaController.name);

  constructor(
    private readonly mediaService: ServiceExecutionMediaService,
  ) {}

  // ===========================================================
  // EVIDENCE UPLOAD METHODS
  // ===========================================================

  @GrpcMethod('ServiceExecutionMediaService', 'UploadEvidenceFiles')
  async uploadEvidenceFiles(
    @Payload() request: UploadEvidenceFilesGrpcRequest,
  ): Promise<BaseResponseDto<MultipleEvidenceUploadResponseDto>> {
    this.logger.log(`[gRPC] UploadEvidenceFiles called: bookingExternalId=${request.bookingExternalId}, fileCount=${request.files?.length || 0}, professionalId=${request.professionalId}, isPlatformAdmin=${request.isPlatformAdmin}`);
    
    try {
      // Convert gRPC files to EvidenceFileInput format
      const files = request.files?.map(f => toEvidenceFileInput(f)) || [];
      
      if (files.length === 0) {
        return BaseResponseDto.fail('No files provided for upload', 'NO_FILES');
      }

      // Service now returns BaseResponseDto directly
      const response = await this.mediaService.uploadEvidenceFiles(
        request.bookingExternalId,
        files,
      );

      // If service returned an error, return it as is
      if (!response.success) {
        return response;
      }

      return BaseResponseDto.ok(response.data, response.message, 'OK');

    } catch (error) {
      this.logger.error(`Error uploading evidence files: ${error.message}`);
      throw new RpcException({
        code: 13, // Internal Server Error
        message: error.message,
      });
    }
  }
}