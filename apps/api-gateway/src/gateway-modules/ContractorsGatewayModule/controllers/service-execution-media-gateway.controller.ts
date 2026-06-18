import {
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
  Req,
  Body,
  Version,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../AuthenticationGatewayModule/jwt.guard';
import { JwtRequest } from '@pivota-api/interfaces';
import { BaseResponseDto, MultipleEvidenceUploadResponseDto } from '@pivota-api/dtos';
import { ServiceExecutionMediaGatewayService } from '../services/service-execution-media-gateway.service';

// Custom Decorators
import { Permissions } from '../../../decorators/permissions.decorator';
import { SetModule } from '../../../decorators/set-module.decorator';
import { Permissions as P, ModuleSlug, isPlatformRole, RoleType } from '@pivota-api/access-management';

// File filter for evidence uploads
const evidenceFileFilter = (req: any, file: any, callback: any) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    callback(null, true);
  } else {
    callback(
      new Error(`Invalid file type: ${file.mimetype}. Allowed types: JPEG, PNG, WEBP, GIF, MP4, MOV, AVI, WEBM`),
      false,
    );
  }
};

@ApiTags('Service Execution Media')
@ApiBearerAuth()
@Controller('service-execution-media')
@SetModule(ModuleSlug.PROFESSIONAL_SERVICES)
@UseGuards(JwtAuthGuard)
export class ServiceExecutionMediaGatewayController {
  private readonly logger = new Logger(ServiceExecutionMediaGatewayController.name);

  constructor(
    private readonly mediaService: ServiceExecutionMediaGatewayService,
  ) {}

  /**
   * Helper to check if user has platform role
   */
  private hasPlatformRole(user: JwtRequest['user']): boolean {
    const userRole = user.role as RoleType;
    return isPlatformRole(userRole);
  }

  // ===========================================================
  // EVIDENCE UPLOAD
  // ===========================================================

  @Post('upload-evidence')
  @Permissions(P.PROFESSIONAL_SERVICES_CREATE_OWN)
  @Version('1')
  @UseInterceptors(FilesInterceptor('files', 10, {
    fileFilter: evidenceFileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Upload evidence files for a booking',
    description: 'Upload photos or videos as proof of work (max 10 files, 10MB each). Allowed formats: JPEG, PNG, WEBP, GIF, MP4, MOV, AVI, WEBM'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        bookingExternalId: { 
          type: 'string', 
          format: 'uuid', 
          example: '3784904e-0524-4146-bcee-22009a0a748a',
          description: 'Booking external UUID'
        },
        files: { 
          type: 'array', 
          items: { type: 'string', format: 'binary' },
          description: 'Evidence files (images or videos)'
        }
      },
      required: ['bookingExternalId', 'files']
    }
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Evidence uploaded successfully',
    type: BaseResponseDto<MultipleEvidenceUploadResponseDto>
  })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your booking' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async uploadEvidenceFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('bookingExternalId') bookingExternalId: string,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<MultipleEvidenceUploadResponseDto>> {
    const professionalId = req.user.professionalId;
    const isPlatformAdmin = this.hasPlatformRole(req.user);

    if (!professionalId && !isPlatformAdmin) {
      const response = BaseResponseDto.fail(
        'No professional profile found. Please create a professional profile first.',
        'PROFILE_NOT_FOUND'
      );
      throw response;
    }

    if (!bookingExternalId) {
      const response = BaseResponseDto.fail(
        'bookingExternalId is required',
        'MISSING_BOOKING_ID'
      );
      throw response;
    }

    if (!files || files.length === 0) {
      const response = BaseResponseDto.fail(
        'No files uploaded. Please provide at least one evidence file.',
        'NO_FILES'
      );
      throw response;
    }

    this.logger.debug(`Uploading ${files.length} evidence files for booking: ${bookingExternalId} by professional: ${professionalId || 'platform-admin'}`);
    
    const response = await this.mediaService.uploadEvidenceFiles(
      files,
      bookingExternalId,
      professionalId || '',
      isPlatformAdmin
    );
    
    if (!response.success) {
      throw response;
    }
    
    return response;
  }
}