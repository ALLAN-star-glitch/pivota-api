"use strict";

import {
  Body,
  Controller,
  Logger,
  Post,
  Get,
  Patch,
  Param,
  Version,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import {
  BaseResponseDto,
  CreatePriceUnitRuleDto,
  PriceUnitRuleResponseDto,
  PricingMetadataResponseDto,
} from '@pivota-api/dtos';

import { JwtAuthGuard } from '../../AuthGatewayModule/jwt.guard';
import { PermissionsGuard } from '../../../guards/PermissionGuard.guard';
import { Permissions } from '../../../decorators/permissions.decorator';
import { Public } from '../../../decorators/public.decorator';
import { SetModule } from '../../../decorators/set-module.decorator';
import { Permissions as P, ModuleSlug } from '@pivota-api/access-management';
import { ContractorsPricingGatewayService } from '../services/contractors-pricing-gateway.service';

@ApiTags('Contractors - Pricing')
@Controller('contractors-pricing')
@SetModule(ModuleSlug.PROFESSIONAL_SERVICES)
export class ContractorsPricingGatewayController {
  private readonly logger = new Logger(ContractorsPricingGatewayController.name);

  constructor(private readonly pricingService: ContractorsPricingGatewayService) {}

  // ===========================================================
  // 💰 PRICING - PUBLIC METADATA
  // ===========================================================

  /**
   * Get pricing metadata
   * 
   * Fetches pricing units and validation rules grouped by vertical.
   * Used by the frontend to dynamically display min/max prices and required fields.
   * 
   * @returns Pricing metadata with validation rules for each vertical
   */
  @Get('metadata')
  @Public()
  @Version('1')
  @ApiTags('Contractors - Pricing')
  @ApiOperation({ 
    summary: '📊 Fetch pricing units and validation rules grouped by vertical',
    description: `
      Fetches pricing units and validation rules grouped by vertical.
      
      ---
      ## 🔐 Access Control
      - **Authentication:** Not required
      - **Permission:** Public endpoint
      
      ---
      ## 📦 What is Pricing Metadata?
      Pricing metadata defines the validation rules for service offerings across
      different verticals. It ensures consistent pricing and required fields
      when contractors create service listings.
      
      ---
      ## 📁 Vertical Groups
      | Vertical | Description |
      |----------|-------------|
      | **HOUSING** | Property-related services |
      | **JOBS** | Employment services |
      | **SOCIAL_SUPPORT** | Community support services |
      | **SERVICES** | General contractor services |
      
      ---
      ## 💰 Pricing Units
      | Unit | Description |
      |------|-------------|
      | **FIXED** | Fixed price for the entire service |
      | **PER_HOUR** | Hourly rate |
      | **PER_SESSION** | Per session/visit rate |
      | **PER_DAY** | Daily rate |
      | **PER_PROJECT** | Project-based pricing |
      
      ---
      ## 🎯 Use Cases
      - Dynamic form validation in frontend
      - Price range enforcement
      - Field requirement flags
      - Currency selection
      - Unit type dropdowns
      
      ---
      ## 📝 Example Response
      \`\`\`json
      {
        "success": true,
        "data": {
          "verticals": {
            "HOUSING": {
              "units": ["FIXED", "PER_HOUR", "PER_SESSION"],
              "rules": [
                {
                  "unit": "FIXED",
                  "minPrice": 1000,
                  "maxPrice": 100000,
                  "currency": "KES",
                  "isExperienceRequired": false,
                  "isNotesRequired": false
                }
              ]
            }
          },
          "defaultCurrency": "KES"
        }
      }
      \`\`\`
    `
  })
  @ApiOkResponse({ 
    type: BaseResponseDto,
    schema: {
      example: {
        success: true,
        message: 'Pricing metadata retrieved successfully',
        code: 'OK',
        data: {
          verticals: {
            HOUSING: {
              units: ['FIXED', 'PER_HOUR', 'PER_SESSION'],
              rules: [
                {
                  unit: 'FIXED',
                  minPrice: 1000,
                  maxPrice: 100000,
                  currency: 'KES',
                  isExperienceRequired: false,
                  isNotesRequired: false,
                  isActive: true
                },
                {
                  unit: 'PER_HOUR',
                  minPrice: 500,
                  maxPrice: 5000,
                  currency: 'KES',
                  isExperienceRequired: true,
                  isNotesRequired: false,
                  isActive: true
                }
              ]
            },
            JOBS: {
              units: ['FIXED', 'PER_HOUR'],
              rules: [
                {
                  unit: 'PER_HOUR',
                  minPrice: 300,
                  maxPrice: 10000,
                  currency: 'KES',
                  isExperienceRequired: true,
                  isNotesRequired: true,
                  isActive: true
                }
              ]
            }
          },
          defaultCurrency: 'KES',
          lastUpdated: '2026-03-05T10:30:00.000Z'
        }
      }
    }
  })
  async getPricingMetadata(): Promise<BaseResponseDto<PricingMetadataResponseDto>> {
    this.logger.debug('REST GetPricingMetadata triggered');
    return this.pricingService.getPricingMetadata();
  }

  // ===========================================================
  // 💰 PRICING - ADMIN OPERATIONS
  // ===========================================================

  /**
   * Create or update a pricing rule (Admin only)
   * 
   * Creates or updates a pricing validation rule for a specific vertical and unit.
   * 
   * @param dto - Pricing rule details
   * @returns Created/updated pricing rule
   */
  @Post('rule')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(P.PROFESSIONAL_SERVICES_VERIFY)
  @Version('1')
  @ApiTags('Contractors - Pricing Admin')
  @ApiOperation({ 
    summary: '👑 Admin: Create or update a pricing validation rule',
    description: `
      Creates or updates a pricing validation rule for a specific vertical and unit.
      
      ---
      ## 🔐 Access Control
      - **Authentication:** Required (JWT cookie)
      - **Permission Required:** \`${P.PROFESSIONAL_SERVICES_VERIFY}\`
      - **Accessible by:** Platform Admins (SuperAdmin, PlatformSystemAdmin)
      
      ---
      ## 📦 What are Pricing Rules?
      Pricing rules define the validation constraints for service offerings.
      They ensure that contractors enter valid pricing information.
      
      ---
      ## 📋 Rule Components
      | Field | Description |
      |-------|-------------|
      | **vertical** | The vertical this rule applies to |
      | **unit** | Pricing unit (FIXED, PER_HOUR, etc.) |
      | **categoryId** | Optional category-specific rule |
      | **minPrice** | Minimum allowed price |
      | **maxPrice** | Maximum allowed price |
      | **currency** | Currency code (KES, USD, etc.) |
      | **isExperienceRequired** | Whether experience must be provided |
      | **isNotesRequired** | Whether notes must be provided |
      | **isActive** | Whether the rule is currently active |
      
      ---
      ## 🔄 Rule Hierarchy
      1. Category-specific rules (if categoryId provided)
      2. Vertical-level rules (if no category)
      3. Default system rules (fallback)
      
      ---
      ## ⚠️ Important Notes
      - Rules are upserted - existing rules are updated
      - Changes affect all new service offerings immediately
      - Existing offerings retain their original prices
    `
  })
  @ApiBody({ 
    type: CreatePriceUnitRuleDto,
    examples: {
      'Create housing fixed price rule': {
        value: {
          vertical: 'HOUSING',
          unit: 'FIXED',
          categoryId: 'cat_123abc',
          minPrice: 1000,
          maxPrice: 100000,
          currency: 'KES',
          isExperienceRequired: false,
          isNotesRequired: true,
          isActive: true
        }
      },
      'Create hourly rate rule': {
        value: {
          vertical: 'JOBS',
          unit: 'PER_HOUR',
          minPrice: 500,
          maxPrice: 5000,
          currency: 'KES',
          isExperienceRequired: true,
          isNotesRequired: false,
          isActive: true
        }
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: '✅ Rule created/updated successfully',
    type: PriceUnitRuleResponseDto,
    schema: {
      example: {
        success: true,
        message: 'Pricing rule saved successfully',
        code: 'CREATED',
        data: {
          id: 'rule_123abc',
          vertical: 'HOUSING',
          unit: 'FIXED',
          categoryId: 'cat_456def',
          minPrice: 1000,
          maxPrice: 100000,
          currency: 'KES',
          isExperienceRequired: false,
          isNotesRequired: true,
          isActive: true,
          createdAt: '2026-03-05T10:30:00.000Z',
          updatedAt: '2026-03-05T10:30:00.000Z'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: '❌ Validation error - Invalid input data' 
  })
  @ApiResponse({ 
    status: 401, 
    description: '❌ Unauthorized' 
  })
  @ApiResponse({ 
    status: 403, 
    description: `❌ Forbidden - Requires ${P.PROFESSIONAL_SERVICES_VERIFY} permission` 
  })
  @ApiResponse({ 
    status: 409, 
    description: '❌ Conflict - Rule with same parameters already exists' 
  })
  async upsertRule(
    @Body() dto: CreatePriceUnitRuleDto,
  ): Promise<BaseResponseDto<PriceUnitRuleResponseDto>> {
    this.logger.debug(`REST UpsertRule for vertical: ${dto.vertical}`);
    return this.pricingService.upsertRule(dto);
  }

  /**
   * Toggle rule status (Admin only)
   * 
   * Activates or deactivates a pricing rule.
   * 
   * @param id - ID of the rule to toggle
   * @param active - New active status (true = active, false = inactive)
   * @returns Updated rule with new status
   */
  @Patch('rule/:id/toggle')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(P.PROFESSIONAL_SERVICES_VERIFY)
  @Version('1')
  @ApiTags('Contractors - Pricing Admin')
  @ApiOperation({ 
    summary: '👑 Admin: Activate or deactivate a pricing rule',
    description: `
      Activates or deactivates a pricing rule.
      
      ---
      ## 🔐 Access Control
      - **Authentication:** Required (JWT cookie)
      - **Permission Required:** \`${P.PROFESSIONAL_SERVICES_VERIFY}\`
      - **Accessible by:** Platform Admins (SuperAdmin, PlatformSystemAdmin)
      
      ---
      ## 🔄 Why toggle rules?
      - Temporarily disable rules without deleting them
      - Test new pricing rules in production
      - Handle seasonal pricing changes
      - Roll back problematic rules quickly
      - Maintain rule history for audit
      
      ---
      ## 📋 Effect of Deactivation
      - Rule no longer applies to new service offerings
      - Existing offerings are not affected
      - Can be reactivated at any time
      - Metadata API excludes inactive rules
      
      ---
      ## 🎯 Use Cases
      - Holiday pricing adjustments
      - Promotional periods
      - Testing new pricing models
      - Emergency price freezes
      - Gradual rule rollout
    `
  })
  @ApiParam({ 
    name: 'id', 
    description: 'ID of the pricing rule to toggle',
    example: 'rule_123abc'
  })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        active: { 
          type: 'boolean', 
          description: 'New active status (true = active, false = inactive)',
          example: false
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: '✅ Rule status updated successfully',
    type: PriceUnitRuleResponseDto,
    schema: {
      example: {
        success: true,
        message: 'Rule status updated successfully',
        code: 'OK',
        data: {
          id: 'rule_123abc',
          vertical: 'HOUSING',
          unit: 'FIXED',
          isActive: false,
          updatedAt: '2026-03-05T14:30:00.000Z'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: '❌ Unauthorized' 
  })
  @ApiResponse({ 
    status: 403, 
    description: `❌ Forbidden - Requires ${P.PROFESSIONAL_SERVICES_VERIFY} permission` 
  })
  @ApiResponse({ 
    status: 404, 
    description: '❌ Rule not found' 
  })
  async toggleRule(
    @Param('id') id: string,
    @Body('active') active: boolean,
  ): Promise<BaseResponseDto<PriceUnitRuleResponseDto>> {
    this.logger.debug(`REST ToggleRule ID: ${id} to ${active}`);
    return this.pricingService.toggleRule(id, active);
  }
}