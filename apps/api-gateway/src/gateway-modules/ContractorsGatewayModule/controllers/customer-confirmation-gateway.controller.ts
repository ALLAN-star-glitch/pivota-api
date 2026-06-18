import {
  Controller,
  Logger,
  Post,
  Body,
  Req,
  UseGuards,
  Version,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBody,
} from '@nestjs/swagger';

import {
  BaseResponseDto,
  ConfirmSatisfactionRequestDto,
  ReportDissatisfactionRequestDto,
  ConfirmSatisfactionResponseDto,
  ReportDissatisfactionResponseDto,
} from '@pivota-api/dtos';

import { JwtAuthGuard } from '../../AuthenticationGatewayModule/jwt.guard';
import { PermissionsGuard } from '../../../guards/PermissionGuard.guard';
import { SubscriptionGuard } from '../../../guards/subscription.guard';
import { JwtRequest } from '@pivota-api/interfaces';
import { CustomerConfirmationGatewayService } from '../services/customer-confirmation-gateway.service';


import { SetModule } from '../../../decorators/set-module.decorator';
import { ModuleSlug, isPlatformRole, RoleType } from '@pivota-api/access-management';

@ApiTags('Customer Confirmation')
@ApiBearerAuth()
@Controller('customer-confirmation')
@SetModule(ModuleSlug.PROFESSIONAL_SERVICES)
@UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionGuard)
export class CustomerConfirmationGatewayController {
  private readonly logger = new Logger(CustomerConfirmationGatewayController.name);

  constructor(
    private readonly customerConfirmationService: CustomerConfirmationGatewayService,
  ) {}

  /**
   * Helper to check if user has platform role (bypass business logic)
   */
  private hasPlatformRole(user: JwtRequest['user']): boolean {
    const userRole = user.role as RoleType;
    return isPlatformRole(userRole);
  }

  // ===========================================================
  // CUSTOMER CONFIRMATION METHODS
  // ===========================================================

  @Post('confirm')
  @Version('1')
  @ApiOperation({ 
    summary: 'Confirm satisfaction with completed work',
    description: 'Customer confirms that the work is completed satisfactorily. This will release payment to the professional.'
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
  @ApiResponse({ status: 200, description: 'Satisfaction confirmed successfully. Payment released.' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your booking' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async confirmSatisfaction(
    @Body() dto: ConfirmSatisfactionRequestDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<ConfirmSatisfactionResponseDto>> {
    const customerId = req.user.sub;
    const isPlatformAdmin = this.hasPlatformRole(req.user);

    if (!customerId && !isPlatformAdmin) {
      const response = BaseResponseDto.fail(
        'User not found. Please ensure you are logged in.',
        'USER_NOT_FOUND'
      );
      throw response;
    }

    // Set hidden fields from JWT token
    dto.customerId = customerId;
    dto.isPlatformAdmin = isPlatformAdmin;

    this.logger.debug(`Confirming satisfaction for booking: ${dto.bookingExternalId} by customer: ${customerId}, isPlatformAdmin: ${isPlatformAdmin}`);
    
    const response = await this.customerConfirmationService.confirmSatisfaction(dto);
    
    if (!response.success) {
      throw response;
    }
    
    return response;
  }

  @Post('report-issue')
  @Version('1')
  @ApiOperation({ 
    summary: 'Report dissatisfaction with completed work',
    description: 'Customer reports that the work was not completed satisfactorily. This will create a dispute for admin review.'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        bookingExternalId: { type: 'string', format: 'uuid', example: '3784904e-0524-4146-bcee-22009a0a748a' },
        reason: { type: 'string', example: 'Work was not completed properly' },
        description: { type: 'string', example: 'The plumber did not fix the leak completely. Water is still dripping.' },
        evidenceUrls: { 
          type: 'array', 
          items: { type: 'string' },
          example: ['https://storage.pivotaconnect.com/dispute/evidence1.jpg']
        }
      },
      required: ['bookingExternalId', 'reason']
    }
  })
  @ApiResponse({ status: 200, description: 'Dissatisfaction reported. Dispute created.' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your booking' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async reportDissatisfaction(
    @Body() dto: ReportDissatisfactionRequestDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<ReportDissatisfactionResponseDto>> {
    const customerId = req.user.sub;
    const isPlatformAdmin = this.hasPlatformRole(req.user);

    if (!customerId && !isPlatformAdmin) {
      const response = BaseResponseDto.fail(
        'User not found. Please ensure you are logged in.',
        'USER_NOT_FOUND'
      );
      throw response;
    }

    // Set hidden fields from JWT token
    dto.customerId = customerId;
    dto.isPlatformAdmin = isPlatformAdmin;

    this.logger.debug(`Reporting dissatisfaction for booking: ${dto.bookingExternalId} by customer: ${customerId}, reason: ${dto.reason}, isPlatformAdmin: ${isPlatformAdmin}`);
    
    const response = await this.customerConfirmationService.reportDissatisfaction(dto);
    
    if (!response.success) {
      throw response;
    }
    
    return response;
  }
}