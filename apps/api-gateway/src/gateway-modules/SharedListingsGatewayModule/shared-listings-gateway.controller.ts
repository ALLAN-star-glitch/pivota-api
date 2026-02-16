import { 
  Controller, 
  Get, 
  Query, 
  UseGuards, 
  Logger,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { 
  ApiBearerAuth, 
  ApiExtraModels, 
  ApiOperation, 
  ApiResponse, 
  ApiTags 
} from '@nestjs/swagger';

import { 
  AdminListingFilterDto, 
  BaseResponseDto, 
  ListingRegistryDataDto,
  GetOwnListingsResponseDto,
  GetAdminListingsResponseDto
} from '@pivota-api/dtos';

import { SharedListingsGatewayService } from './shared-listings-gateway.service';
import { JwtAuthGuard } from '../AuthGatewayModule/jwt.guard'; 
import { JwtRequest } from '@pivota-api/interfaces';

// Custom Decorators & Guards
import { Permissions } from '../../decorators/permissions.decorator';
import { Roles } from '../../decorators/roles.decorator'; 
import { RolesGuard } from '../../guards/role.guard';
import { SubscriptionGuard } from '../../guards/subscription.guard';
import { SetModule } from '../../decorators/set-module.decorator';

@ApiTags('Registry Module - ((Listings-Service) - MICROSERVICE)')
@ApiBearerAuth()
@ApiExtraModels(BaseResponseDto, ListingRegistryDataDto, GetOwnListingsResponseDto, GetAdminListingsResponseDto)
@SetModule('registry') 
@Controller('registry-module')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
export class SharedListingsGatewayController {
  private readonly logger = new Logger(SharedListingsGatewayController.name);

  constructor(private readonly gatewayService: SharedListingsGatewayService) {}

  /**
   * Core Execution Logic
   */
  private async executeRegistryLookup(
    accountId: string | null,
    query?: AdminListingFilterDto
  ): Promise<BaseResponseDto<ListingRegistryDataDto>> {
    try {
      if (query) {
        this.logger.debug(`Processing ADMIN Registry Lookup: ${JSON.stringify(query)}`);
        return await this.gatewayService.getAdminListings(query);
      }

      this.logger.debug(`Processing OWN Registry Lookup for Account ${accountId}`);
      return await this.gatewayService.getOwnListings(accountId as string);
      
    } catch (error) {
      this.logger.error(`🔥 Registry lookup execution failed`, error instanceof Error ? error.stack : error);
      return BaseResponseDto.fail('Unexpected error while aggregating listings', 'INTERNAL_ERROR');
    }
  }

  // -----------------------------------------------------------
  // GET OWN LISTINGS
  // -----------------------------------------------------------
  @Get('my-portfolio')
  @Permissions('listings.read')
  @ApiOperation({ 
    summary: 'Get all listings belonging to the authenticated account',
    description: 'Enforces ownership by extracting accountId from the JWT.' 
  })
  @ApiResponse({ status: 200, type: GetOwnListingsResponseDto })
  async getOwnListings(
    @Req() req: JwtRequest
  ): Promise<BaseResponseDto<ListingRegistryDataDto>> {
    const requesterUuid = req.user.userUuid;
    const requesterAccountId = req.user.accountId;

    // In this "Own" flow, target and requester are identical by definition
    this.logger.log(`👤 User ${requesterUuid} accessing portfolio for account ${requesterAccountId}`);
    
    const response = await this.executeRegistryLookup(requesterAccountId);

    if (!response.success) {
      this.logger.error(`Registry fetch failed for User ${requesterUuid}: ${response.message}`);
      throw response;
    }

    return response;
  }
  

  
  // -----------------------------------------------------------
  // GET ADMIN LISTINGS
  // -----------------------------------------------------------
  @Get('admin/all-listings')
  @Permissions('listings.read')
  @Roles('SuperAdmin', 'SystemAdmin', 'BusinessSystemAdmin', 'ComplianceAdmin', 'ModuleManager')
  @ApiOperation({ 
    summary: 'Admin: System-wide listing lookup'
  })
  @ApiResponse({ status: 200, type: GetAdminListingsResponseDto })
  async getAdminListings(
    @Query() query: AdminListingFilterDto,
    @Req() req: JwtRequest
  ): Promise<BaseResponseDto<ListingRegistryDataDto>> {
    const requesterUuid = req.user.userUuid;
    const requesterAccountId = req.user.accountId;
    const requesterRole = req.user.role;

    // 1. Resolve Target Identity from Query (if provided)
    const targetAccountId = query.accountId || null;
    const targetCreatorId = query.creatorId || null;

    // 2. Permission Check Logic
    // If the request targets a specific account/user that is NOT the requester
    if (
      (targetAccountId && targetAccountId !== requesterAccountId) || 
      (targetCreatorId && targetCreatorId !== requesterUuid)
    ) {
      const isAdmin = ['SuperAdmin', 'SystemAdmin', 'ModuleManager', 'BusinessSystemAdmin', 'ComplianceAdmin'].includes(requesterRole);

      if (!isAdmin) {
        this.logger.warn(`🚫 Unauthorized Registry access attempt by ${requesterUuid} for Account ${targetAccountId}`);
        throw new ForbiddenException('You do not have permission to view listings for other accounts or users.');
      }
      
      this.logger.log(`👮 Admin ${requesterRole} (${requesterUuid}) inspecting registry for: Account ${targetAccountId ?? 'Global'}`);
    }

    const response = await this.executeRegistryLookup(null, query);

    if (!response.success) {
      if (response.code === 'FORBIDDEN') throw new ForbiddenException(response.message);
      throw response;
    }

    return response;
  }
}