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
  AssignPlanDto,
  SubscriptionResponseDto,
} from '@pivota-api/dtos';
import { SubscriptionsGatewayService } from './subscriptions-gateway.service';
import { Roles } from '../../decorators/roles.decorator';
import { RolesGuard } from '../../guards/role.guard';

@ApiTags('Subscriptions Module - ((Subscriptions-Service) - MICROSERVICE)')
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
  @Post('/assign-plan')
  @ApiOperation({ summary: 'Assign a subscription plan to a user' })
  async assignPlan(
    @Body() dto: AssignPlanDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<SubscriptionResponseDto>> {
    const userUuid = req.user.userUuid;
    this.logger.debug(
      `REST assignPlan request by user=${userUuid}: ${JSON.stringify(dto)}`,
    );

    const response = await this.subscriptionsService.assignPlan(dto);
    return response;
  }

  // ===========================================================
  // GET SUBSCRIPTION BY USER UUID (Public / Admin)
  // ===========================================================
  @ApiParam({ name: 'userUuid', type: String, description: 'UUID of the user' })
  @Version('1')
  @Get('/user/:userUuid')
  @ApiOperation({ summary: 'Get subscription details by user UUID' })
  async getSubscriptionByUser(
    @Param('userUuid') userUuid: string,
  ): Promise<BaseResponseDto<SubscriptionResponseDto>> {
    this.logger.debug(`REST getSubscriptionByUser request: userUuid=${userUuid}`);

    const response = await this.subscriptionsService.getSubscriptionByUser(userUuid);
    return response;
  }
}
