import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import {
  BaseResponseDto,
  MultipleEvidenceUploadResponseDto,
} from '@pivota-api/dtos';


// ======================================================
// gRPC Client Interface
// ======================================================

interface ServiceExecutionMediaServiceGrpc {
  uploadEvidenceFiles(data: {
    bookingExternalId: string;
    files: Array<{ buffer: Buffer; originalname: string; mimetype: string; size: number }>;
    professionalId: string;
    isPlatformAdmin: boolean;
  }): Observable<BaseResponseDto<MultipleEvidenceUploadResponseDto>>;
}

@Injectable()
export class ServiceExecutionMediaGatewayService {
  private readonly logger = new Logger(ServiceExecutionMediaGatewayService.name);
  private grpcService: ServiceExecutionMediaServiceGrpc;

  constructor(
    @Inject('SERVICE_EXECUTION_MEDIA_PACKAGE') private readonly grpcClient: ClientGrpc,
  ) {
    this.grpcService = this.grpcClient.getService<ServiceExecutionMediaServiceGrpc>('ServiceExecutionMediaService');
  }

  // ===========================================================
  // EVIDENCE UPLOAD METHODS
  // ===========================================================

  /**
   * Upload evidence files for a booking
   * @param files - Array of files to upload
   * @param bookingExternalId - The booking external ID
   * @param professionalId - The professional's UUID (from JWT)
   * @param isPlatformAdmin - Whether the user is a platform admin
   * @returns Response with uploaded file information
   */
  async uploadEvidenceFiles(
    files: Express.Multer.File[],
    bookingExternalId: string,
    professionalId: string,
    isPlatformAdmin = false,
  ): Promise<BaseResponseDto<MultipleEvidenceUploadResponseDto>> {
    try {
      const response = await firstValueFrom(
        this.grpcService.uploadEvidenceFiles({
          bookingExternalId,
          files: files.map(file => ({
            buffer: file.buffer,
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
          })),
          professionalId,
          isPlatformAdmin,
        })
      );

      this.logger.debug(`UploadEvidenceFiles gRPC Response: ${JSON.stringify(response)}`);

      if (response?.success) {
        return BaseResponseDto.ok(response.data, response.message, response.code);
      }

      return BaseResponseDto.fail(response?.message, response?.code);
    } catch (error) {
      this.logger.error(`gRPC Error uploading evidence files: ${error.message}`);
      return BaseResponseDto.fail('Failed to upload evidence files', 'GRPC_ERROR');
    }
  }
}