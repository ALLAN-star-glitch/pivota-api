import {
  Controller,
  Logger,
  Post,
  Get,
  Body,
  Param,
  Req,
  UseGuards,
  Version,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

import {
  BaseResponseDto,
  StartWorkRequestDto,
  CompleteWorkRequestDto,
  GetWorkStatusRequestDto,
  CheckAutoReleaseEligibilityRequestDto,
  StartWorkResponseDto,
  CompleteWorkResponseDto,
  WorkStatusResponseDto,
  AutoReleaseEligibilityResponseDto,
} from '@pivota-api/dtos';

import { JwtAuthGuard } from '../../AuthenticationGatewayModule/jwt.guard';
import { PermissionsGuard } from '../../../guards/PermissionGuard.guard';
import { SubscriptionGuard } from '../../../guards/subscription.guard';
import { JwtRequest } from '@pivota-api/interfaces';
import { ServiceExecutionGatewayService } from '../services/service-execution-gateway.service';

// Custom Decorators
import { Permissions } from '../../../decorators/permissions.decorator';
import { SetModule } from '../../../decorators/set-module.decorator';
import { Permissions as P, ModuleSlug, isPlatformRole, RoleType } from '@pivota-api/access-management';

@ApiTags('Professionals Service Execution')
@ApiBearerAuth()
@Controller('service-execution')
@SetModule(ModuleSlug.PROFESSIONAL_SERVICES)
@UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionGuard)
export class ServiceExecutionGatewayController {
  private readonly logger = new Logger(ServiceExecutionGatewayController.name);

  constructor(
    private readonly serviceExecutionService: ServiceExecutionGatewayService,
  ) {}

  /**
   * Helper to check if user has platform role (bypass business logic)
   */
  private hasPlatformRole(user: JwtRequest['user']): boolean {
    const userRole = user.role as RoleType;
    return isPlatformRole(userRole);
  }

  // ===========================================================
  // SERVICE EXECUTION METHODS
  // ===========================================================

  @Post('start-work')
  @Permissions(P.PROFESSIONAL_SERVICES_CREATE_OWN, P.PROFESSIONAL_SERVICES_CREATE_ANY)
  @Version('1')
  @ApiOperation({ 
    summary: 'Professional starts work on a booking',
    description: 'Professional marks that they have started the service. Status changes from NOT_STARTED to IN_PROGRESS.'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        bookingExternalId: { type: 'string', format: 'uuid', example: '3784904e-0524-4146-bcee-22009a0a748a' }
      },
      required: ['bookingExternalId']
    }
  })
  @ApiResponse({ status: 200, description: 'Work started successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your booking' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async startWork(
    @Body() dto: StartWorkRequestDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<StartWorkResponseDto>> {
    const professionalId = req.user.professionalId;
    const isPlatformAdmin = this.hasPlatformRole(req.user);

    if (!professionalId && !isPlatformAdmin) {
      const response = BaseResponseDto.fail(
        'No professional profile found. Please create a professional profile first.',
        'PROFILE_NOT_FOUND'
      );
      throw response;
    }

    // Set hidden fields from JWT token
    dto.professionalId = professionalId || '';
    dto.isPlatformAdmin = isPlatformAdmin;

    this.logger.debug(`Starting work for booking: ${dto.bookingExternalId} by professional: ${professionalId || 'platform-admin'}, isPlatformAdmin: ${isPlatformAdmin}`);
    
    const response = await this.serviceExecutionService.startWork(dto);
    
    if (!response.success) {
      throw response;
    }
    
    return response;
  }

  @Post('complete-work')
  @Permissions(P.PROFESSIONAL_SERVICES_CREATE_OWN)
  @Version('1')
  @ApiOperation({ 
    summary: 'Professional completes work on a booking',
    description: 'Professional marks that they have completed the service. Status changes from IN_PROGRESS to COMPLETED. Auto-release is set for 48 hours later.'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        bookingExternalId: { type: 'string', format: 'uuid', example: '3784904e-0524-4146-bcee-22009a0a748a' },
        evidenceUrls: { 
          type: 'array', 
          items: { type: 'string' },
          example: ['https://storage.pivotaconnect.com/evidence/photo1.jpg']
        }
      },
      required: ['bookingExternalId']
    }
  })
  @ApiResponse({ status: 200, description: 'Work completed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your booking' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async completeWork(
    @Body() dto: CompleteWorkRequestDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<CompleteWorkResponseDto>> {
    const professionalId = req.user.professionalId;
    const isPlatformAdmin = this.hasPlatformRole(req.user);

    if (!professionalId && !isPlatformAdmin) {
      const response = BaseResponseDto.fail(
        'No professional profile found. Please create a professional profile first.',
        'PROFILE_NOT_FOUND'
      );
      throw response;
    }

    // Set hidden fields from JWT token
    dto.professionalId = professionalId || '';
    dto.isPlatformAdmin = isPlatformAdmin;

    this.logger.debug(`Completing work for booking: ${dto.bookingExternalId} by professional: ${professionalId || 'platform-admin'}, evidenceCount: ${dto.evidenceUrls?.length || 0}, isPlatformAdmin: ${isPlatformAdmin}`);
    
    const response = await this.serviceExecutionService.completeWork(dto);
    
    if (!response.success) {
      throw response;
    }
    
    return response;
  }


  @Get('work-status/:bookingExternalId')
  @Version('1')
  @ApiOperation({ 
    summary: 'Get work status for a booking',
    description: 'Returns current service execution status, timestamps, evidence, and customer satisfaction.'
  })
  @ApiParam({ 
    name: 'bookingExternalId', 
    description: 'Booking external UUID', 
    example: '3784904e-0524-4146-bcee-22009a0a748a' 
  })
  @ApiResponse({ status: 200, description: 'Work status retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your booking' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async getWorkStatus(
    @Param('bookingExternalId') bookingExternalId: string,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<WorkStatusResponseDto>> {
    const userId = req.user.sub;
    const isPlatformAdmin = this.hasPlatformRole(req.user);

    const dto: GetWorkStatusRequestDto = {
      bookingExternalId,
      userId,
      isPlatformAdmin,
    };

    this.logger.debug(`Getting work status for booking: ${bookingExternalId} by userId: ${userId}, isPlatformAdmin: ${isPlatformAdmin}`);
    
    const response = await this.serviceExecutionService.getWorkStatus(dto);
    
    if (!response.success) {
      throw response;
    }
    
    return response;
  }

  @Get('auto-release/:bookingExternalId')
  @Version('1')
  @ApiOperation({ 
    summary: 'Check if auto-release is eligible for a booking',
    description: 'Returns whether the booking qualifies for automatic payment release after 48 hours of completion.'
  })
  @ApiParam({ 
    name: 'bookingExternalId', 
    description: 'Booking external UUID', 
    example: '3784904e-0524-4146-bcee-22009a0a748a' 
  })
  @ApiResponse({ status: 200, description: 'Auto-release eligibility checked successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async checkAutoReleaseEligible(
    @Param('bookingExternalId') bookingExternalId: string,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<AutoReleaseEligibilityResponseDto>> {
    const isPlatformAdmin = this.hasPlatformRole(req.user);

    const dto: CheckAutoReleaseEligibilityRequestDto = {
      bookingExternalId,
      isPlatformAdmin,
    };

    this.logger.debug(`Checking auto-release eligibility for booking: ${bookingExternalId}, isPlatformAdmin: ${isPlatformAdmin}`);
    
    const response = await this.serviceExecutionService.checkAutoReleaseEligible(dto);
    
    if (!response.success) {
      throw response;
    }
    
    return response;
  }
}