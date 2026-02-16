import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Req,
  UseGuards,
  Version,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../AuthGatewayModule/jwt.guard';
import { JwtRequest } from '@pivota-api/interfaces';
import {
  AccessDataDto,
  BaseResponseDto,
  SubscribeToPlanDto,
  SubscriptionResponseDto,
} from '@pivota-api/dtos';
import { SubscriptionsGatewayService } from './subscriptions-gateway.service';
import { RolesGuard } from '../../guards/role.guard';
import { Roles } from '../../decorators/roles.decorator';
import { Permissions } from '../../decorators/permissions.decorator';


@ApiTags('Subscriptions Module - ((Admin-Service) - MICROSERVICE)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('subscriptions-gateway')
export class SubscriptionsGatewayController {
  private readonly logger = new Logger(SubscriptionsGatewayController.name);

  constructor(private readonly subscriptionsService: SubscriptionsGatewayService) {}

  // ===========================================================
  // ASSIGN PLAN TO USER (Admin Only) - Manual assignment
  // ===========================================================
  @Version('1')
  @Post('/subscription')
  @ApiOperation({ summary: 'Assign a subscription plan to a user' })
  @Permissions('subscriptions.manage') // Only users with this permission can assign plans
  @Roles('SuperAdmin') // You can combine with Roles for double security
  async assignPlan(
    @Body() dto: SubscribeToPlanDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<SubscriptionResponseDto>> {
    const userUuid = req.user.userUuid;
    this.logger.debug(
      `REST assignPlan request by user=${userUuid}: ${JSON.stringify(dto)}`,
    );

    const response = await this.subscriptionsService.subscribeToPlan(dto);
    return response;
  }


  // ===========================================================
  // GET SUBSCRIPTION BY ACCOUNTUUID (Public / Admin)
  // ===========================================================
  @ApiParam({ name: 'accountUuid', type: String, description: 'UUID of the Account' })
  @Version('1')
  @Get('/user/:accountUuid')
  @ApiOperation({ summary: 'Get subscription details by account UUID' })
  async getSubscriptionsByUser(
    @Param('accountUuid') accountUuid: string,
  ): Promise<BaseResponseDto<SubscriptionResponseDto>> {
    this.logger.debug(`REST getSubscriptionByAccount request: accountUuid=${accountUuid}`);

    const response = await this.subscriptionsService.getSubscriptionsByAccount(accountUuid);
    return response;
  }


  // ===========================================================
  // CHECK MODULE ACCESS (Self or Other User via Admin)
  // ===========================================================q
  @Version('1')
  @Get('/check-access/:moduleSlug')
  @ApiOperation({ 
    summary: 'Check module access for the authenticated account' 
  })
  @ApiParam({ name: 'moduleSlug', description: 'The slug of the module e.g., listings' })
  async checkAccess(
    @Param('moduleSlug') moduleSlug: string,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<AccessDataDto>> {
    // We strictly use the accountId from the JWT (Self)
    const targetAccountId = req.user.accountId;

    this.logger.debug(
      `REST checkAccess: Checking access for Self (Account: ${targetAccountId}) for Module: ${moduleSlug}`
    );

    // 1. Call the gRPC service using the authenticated user's account ID
    const response = await this.subscriptionsService.checkModuleAccess(targetAccountId, moduleSlug);
    
    // 2. Parse restrictions for the REST client (Gateway -> Frontend)
    // This ensures the frontend receives a clean JSON object instead of a string
    if (response.success && response.data && typeof response.data.restrictions === 'string') {
      try {
        response.data.restrictions = JSON.parse(response.data.restrictions);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        this.logger.error(`Failed to parse restrictions for account ${targetAccountId}`);
        // Fallback to empty object to prevent frontend crashes
        response.data.restrictions = {};
      }
    }

    return response;
  }
}
