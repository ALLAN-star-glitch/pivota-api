import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
  Version,
} from '@nestjs/common';

import {
  BaseResponseDto,
  CreatePlanDto,
  UpdatePlanDto,
  PlanResponseDto,
} from '@pivota-api/dtos';

import { JwtAuthGuard } from '../AuthGatewayModule/jwt.guard';
import { RolesGuard } from '@pivota-api/guards';
import { Roles } from '@pivota-api/decorators';
import { JwtRequest } from '@pivota-api/interfaces';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { PlansGatewayService } from './plans-gateway.service';

@ApiTags('Pricing Plans Module - ((Plans-Service) - MICROSERVICE)')
@ApiBearerAuth()
@Controller('pricing-plans-module')
export class PlansGatewayController {
  private readonly logger = new Logger(PlansGatewayController.name);

  constructor(private readonly plansService: PlansGatewayService) {}

  // ===========================================================
  // CREATE PLAN (Admin Only)
  // ===========================================================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'SystemsAdmin')
  @Version('1')
  @Post()
  @ApiOperation({ summary: 'Create a new subscription plan' })
  async createPlan(
    @Body() dto: CreatePlanDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<PlanResponseDto>> {
    const userId = req.user.userUuid;
    dto.userId = userId;

    this.logger.debug(
      `REST createPlan request by user=${userId}: ${JSON.stringify(dto)}`,
    );

    return this.plansService.createPlan(dto);
  }

  // ===========================================================
  // GET PLAN BY ID (Public)
  // ===========================================================
  @ApiParam({ name: 'id', type: String, description: 'Plan ID to fetch' })
  @Version('1')
  @Get('/:id')
  @ApiOperation({ summary: 'Get a plan by ID' })
  async getPlanById(
    @Param('id') id: string,
  ): Promise<BaseResponseDto<PlanResponseDto>> {
    this.logger.debug(`REST getPlanById request: ${id}`);
    return this.plansService.getPlanById(id);
  }

  // ===========================================================
  // GET ALL PLANS (Public)
  // ===========================================================
  @Version('1')
  @Get()
  @ApiOperation({ summary: 'Get all available plans' })
  async getAllPlans(): Promise<BaseResponseDto<PlanResponseDto[]>> {
    this.logger.debug(`REST getAllPlans request`);
    return this.plansService.getAllPlans();
  }

  // ===========================================================
  // UPDATE PLAN (Admin Only)
  // ===========================================================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'SystemsAdmin')
  @Version('1')
  @Put(':planId') // planId in URL
  @ApiParam({ name: 'planId', type: String, description: 'ID of the plan to update' })
  @ApiOperation({ summary: 'Update an existing subscription plan' })
  async updatePlan(
    @Param('planId') planId: string,
    @Body() dto: UpdatePlanDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<PlanResponseDto>> {
    const userId = req.user.userUuid;

    this.logger.debug(
      `REST updatePlan request by user=${userId} for plan=${planId}: ${JSON.stringify(dto)}`,
    );

    return this.plansService.updatePlan(planId, dto);
  }

  // ===========================================================
  // DELETE PLAN (Admin Only)
  // ===========================================================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'SystemsAdmin')
  @ApiParam({ name: 'id', type: String, description: 'ID of the plan to delete' })
  @Version('1')
  @Delete('/:id')
  @ApiOperation({ summary: 'Delete a subscription plan by ID' })
  async deletePlan(
    @Param('id') id: string,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<null>> {
    const userId = req.user.userUuid;

    this.logger.debug(
      `REST deletePlan request by user=${userId}: planId=${id}`,
    );

    return this.plansService.deletePlan(id);
  }
}
