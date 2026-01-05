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
  BaseResponseDto,
  SubscribeToPlanDto,
  SubscriptionResponseDto,
} from '@pivota-api/dtos';
import { SubscriptionsGatewayService } from './subscriptions-gateway.service';
import { Roles } from '../../decorators/roles.decorator';
import { RolesGuard } from '../../guards/role.guard';


@ApiTags('Subscriptions Module - ((Admin-Service) - MICROSERVICE)')
@ApiBearerAuth()
@Controller('subscriptions-gateway')
export class SubscriptionsGatewayController {
  private readonly logger = new Logger(SubscriptionsGatewayController.name);

  constructor(private readonly subscriptionsService: SubscriptionsGatewayService) {}

  // ===========================================================
  // ASSIGN PLAN TO USER (Admin Only) - Manual assignment
  // ===========================================================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'SystemsAdmin')
  @Version('1')
  @Post('/subscription')
  @ApiOperation({ summary: 'Assign a subscription plan to a user' })
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'SystemsAdmin')
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
}
