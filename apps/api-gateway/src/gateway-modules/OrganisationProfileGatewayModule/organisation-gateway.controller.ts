import {
  Controller,
  Get,
  Param,
  UseGuards,
  Logger,
  Version,
  Query,
  Patch,
  Body,
  Req,
  Post,
  Delete,
} from '@nestjs/common';
import { OrganisationGatewayService } from './organisation-gateway.service';
import {
  BaseResponseDto,
  OrganizationProfileResponseDto,
  OnboardOrganizationProviderRequestDto,
  ContractorProfileResponseDto,
  // Invitation DTOs
  InviteMemberRequestDto,
  InviteMemberResponseDto,
  VerifyInvitationRequestDto,
  InvitationVerificationResponseDto,
  AcceptInvitationRequestDto,
  AcceptInvitationResponseDto,
  InvitationDetailsResponseDto,
  ResendInvitationRequestDto,
  CheckInvitationStatusRequestDto,
  CheckInvitationStatusResponseDto,
} from '@pivota-api/dtos';
import { JwtAuthGuard } from '../AuthGatewayModule/jwt.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  getSchemaPath,
  ApiExtraModels,
  ApiBody,
} from '@nestjs/swagger';
import { Roles } from '../../decorators/roles.decorator';
import { RolesGuard } from '../../guards/role.guard';
import { SubscriptionGuard } from '../../guards/subscription.guard';
import { SetModule } from '../../decorators/set-module.decorator';
import { JwtRequest } from '@pivota-api/interfaces';

@ApiTags('Organisation Module - ((Profile-Service) - MICROSERVICE)')
@ApiBearerAuth()
@ApiExtraModels(
  BaseResponseDto, 
  OrganizationProfileResponseDto, 
  OnboardOrganizationProviderRequestDto, 
  ContractorProfileResponseDto,
  // Invitation DTOs for Swagger
  InviteMemberRequestDto,
  InviteMemberResponseDto,
  VerifyInvitationRequestDto,
  InvitationVerificationResponseDto,
  AcceptInvitationRequestDto,
  AcceptInvitationResponseDto,
  InvitationDetailsResponseDto,
  ResendInvitationRequestDto,
  CheckInvitationStatusRequestDto,
  CheckInvitationStatusResponseDto,
)
@SetModule('profile')
@Controller('organisation-gateway')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
export class OrganisationGatewayController {
  private readonly logger = new Logger(OrganisationGatewayController.name);

  constructor(
    private readonly organisationService: OrganisationGatewayService,
  ) {}

  /**
   * 🏗️ Onboard Organization as Service Provider
   * Extracts organizationUuid directly from the JWT for security.
   */
  @Version('1')
  @Patch('organisations/onboard-provider')
  @Roles('SuperAdmin', 'SystemAdmin', 'BusinessSystemAdmin')
  @ApiOperation({ 
    summary: 'Activate Organization Service Provider profile',
    description: 'Uses the organizationUuid from the authenticated user token.' 
  })
  @ApiBody({ type: OnboardOrganizationProviderRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Organization successfully activated as a provider.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(ContractorProfileResponseDto) } } },
      ],
    },
  })
  async onboardProvider(
    @Body() dto: OnboardOrganizationProviderRequestDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<ContractorProfileResponseDto>> {
    // Extract the Org ID from the verified token
    const orgUuid = req.user.organizationUuid;

    if (!orgUuid) {
       return BaseResponseDto.fail('No organization associated with this account', 'BAD_REQUEST');
    }

    this.logger.log(`API-GW: Onboarding Org ${orgUuid} via Token for Admin ${req.user.userUuid}`);
    
    return this.organisationService.onboardOrganizationProvider({
      ...dto,
      orgUuid,
    });
  }

  /* ======================================================
     INVITATION ENDPOINTS
  ====================================================== */

  /**
   * 📧 Invite a member to join the organization
   * Business System Admin only - sends email invitation
   */
 @Version('1')
@Post('organisations/members/invite')
@Roles('SuperAdmin', 'SystemAdmin', 'BusinessSystemAdmin')
@ApiOperation({ 
  summary: 'Invite a member to join your organization',
  description: 'Sends an email invitation to the specified email address. Role is automatically set to GeneralUser.'
})
@ApiBody({ type: InviteMemberRequestDto })
@ApiResponse({
  status: 201,
  description: 'Invitation sent successfully',
  schema: {
    allOf: [
      { $ref: getSchemaPath(BaseResponseDto) },
      { properties: { data: { $ref: getSchemaPath(InviteMemberResponseDto) } } },
    ],
  },
})
async inviteMember(
  @Body() dto: InviteMemberRequestDto,
  @Req() req: JwtRequest,
): Promise<BaseResponseDto<InviteMemberResponseDto>> {
  // Now we have organizationUuid directly in the payload!
  const orgUuid = req.user.organizationUuid;
  const invitedByUserUuid = req.user.userUuid;

  // 🔍 ADD THIS DEBUG LOG
  this.logger.log(`🔍 DEBUG - orgUuid from token: "${orgUuid}"`);
  this.logger.log(`🔍 DEBUG - accountType: "${req.user.accountType}"`);
  this.logger.log(`🔍 DEBUG - full user object: ${JSON.stringify(req.user)}`);

  if (!orgUuid) {
    // Double-check if it's an organization account
    if (req.user.accountType !== 'ORGANIZATION') {
      throw BaseResponseDto.fail(
        'Your account is not associated with an organization. Only organization admins can invite members.', 
        'BAD_REQUEST'
      );
    }
    
    // 🔍 ADD THIS - if we get here, organizationUuid is missing but accountType is ORGANIZATION
    this.logger.error(`❌ CRITICAL: User has ORGANIZATION account type but organizationUuid is missing!`);
    throw BaseResponseDto.fail(
      'Token missing organization UUID. Please login again.', 
      'BAD_REQUEST'
    );
  }

  this.logger.log(`API-GW: Admin ${invitedByUserUuid} inviting ${dto.email} to org ${orgUuid}`);
  return this.organisationService.inviteMember(dto, orgUuid, invitedByUserUuid);
}

  /**
   * ✅ Verify an invitation token
   * Public endpoint - no authentication required
   */
  @Version('1')
  @Get('invitations/verify')
  @ApiOperation({ 
    summary: 'Verify an invitation token',
    description: 'Public endpoint to check if an invitation token is valid before showing the acceptance form.'
  })
  @ApiQuery({ name: 'token', required: true, description: 'The invitation token from the email' })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(InvitationVerificationResponseDto) } } },
      ],
    },
  })
  async verifyInvitation(
    @Query('token') token: string,
  ): Promise<BaseResponseDto<InvitationVerificationResponseDto>> {
    this.logger.log(`API-GW: Verifying invitation token: ${token}`);
    return this.organisationService.verifyInvitation({ token });
  }

  /**
   * ✨ Accept an invitation
   * Public endpoint - completes the invitation flow
   */
  @Version('1')
  @Post('invitations/accept')
  @ApiOperation({ 
    summary: 'Accept an organization invitation',
    description: 'Public endpoint to accept an invitation. For new users, provide firstName, lastName, and phone.'
  })
  @ApiBody({ type: AcceptInvitationRequestDto })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(AcceptInvitationResponseDto) } } },
      ],
    },
  })
  async acceptInvitation(
    @Body() dto: AcceptInvitationRequestDto,
  ): Promise<BaseResponseDto<AcceptInvitationResponseDto>> {
    this.logger.log(`API-GW: Accepting invitation with token: ${dto.token}`);
    return this.organisationService.acceptInvitation(dto);
  }

  /**
   * 📋 Get all pending invitations for the organization
   * Business System Admin only
   */
  @Version('1')
  @Get('organisations/members/invitations')
  @Roles('SuperAdmin', 'SystemAdmin', 'BusinessSystemAdmin')
  @ApiOperation({ 
    summary: 'Get all pending invitations',
    description: 'Returns a list of all pending invitations for the current organization.'
  })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { 
          properties: { 
            data: { 
              type: 'array', 
              items: { $ref: getSchemaPath(InvitationDetailsResponseDto) } 
            } 
          } 
        },
      ],
    },
  })
  async getPendingInvitations(
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<InvitationDetailsResponseDto[]>> {
    const orgUuid = req.user.organizationUuid;
    const requestingUserUuid = req.user.userUuid;

    if (!orgUuid) {
      return BaseResponseDto.fail('No organization associated with this account', 'BAD_REQUEST');
    }

    this.logger.log(`API-GW: Fetching pending invitations for org ${orgUuid}`);
    return this.organisationService.getOrganizationInvitations(orgUuid, requestingUserUuid);
  }

  /**
   * 🔄 Resend an invitation
   * Business System Admin only - generates new token and sends new email
   */
  @Version('1')
  @Post('organisations/members/invitations/:invitationId/resend')
  @Roles('SuperAdmin', 'SystemAdmin', 'BusinessSystemAdmin')
  @ApiOperation({ 
    summary: 'Resend an invitation',
    description: 'Generates a new token and sends a new invitation email.'
  })
  @ApiParam({ name: 'invitationId', description: 'The ID of the invitation to resend' })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
      ],
    },
  })
  async resendInvitation(
    @Param('invitationId') invitationId: string,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<null>> {
    const orgUuid = req.user.organizationUuid;
    const requestedByUserUuid = req.user.userUuid;

    if (!orgUuid) {
      return BaseResponseDto.fail('No organization associated with this account', 'BAD_REQUEST');
    }

    this.logger.log(`API-GW: Resending invitation ${invitationId}`);
    return this.organisationService.resendInvitation(
      { invitationId },
      orgUuid,
      requestedByUserUuid
    );
  }

  /**
   * ❌ Cancel a pending invitation
   * Business System Admin only
   */
  @Version('1')
  @Delete('organisations/members/invitations/:invitationId')
  @Roles('SuperAdmin', 'SystemAdmin', 'BusinessSystemAdmin')
  @ApiOperation({ 
    summary: 'Cancel a pending invitation',
    description: 'Cancels a pending invitation. Once cancelled, the token becomes invalid.'
  })
  @ApiParam({ name: 'invitationId', description: 'The ID of the invitation to cancel' })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
      ],
    },
  })
  async cancelInvitation(
    @Param('invitationId') invitationId: string,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<null>> {
    const orgUuid = req.user.organizationUuid;
    const requestedByUserUuid = req.user.userUuid;

    if (!orgUuid) {
      return BaseResponseDto.fail('No organization associated with this account', 'BAD_REQUEST');
    }

    this.logger.log(`API-GW: Cancelling invitation ${invitationId}`);
    return this.organisationService.cancelInvitation(
      { invitationId },
      orgUuid,
      requestedByUserUuid
    );
  }

  /**
   * 🔍 Check if an email has a pending invitation
   * Useful for UI validation
   */
  @Version('1')
  @Get('invitations/check-status')
  @ApiOperation({ 
    summary: 'Check if an email has a pending invitation',
    description: 'Quick check to see if a specific email has a pending invitation for this organization.'
  })
  @ApiQuery({ name: 'email', required: true, description: 'Email address to check' })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(CheckInvitationStatusResponseDto) } } },
      ],
    },
  })
  async checkInvitationStatus(
    @Query('email') email: string,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<CheckInvitationStatusResponseDto>> {
    const orgUuid = req.user.organizationUuid;

    if (!orgUuid) {
      return BaseResponseDto.fail('No organization associated with this account', 'BAD_REQUEST');
    }

    this.logger.log(`API-GW: Checking invitation status for ${email} in org ${orgUuid}`);
    return this.organisationService.checkInvitationStatus({
      email,
      organizationUuid: orgUuid
    });
  }

  /**
   * 🏢 Get Organizations by Type (Slug)
   */
  @Version('1')
  @Get('organisations/filter')
  @Roles('SuperAdmin', 'SystemAdmin', 'ComplianceAdmin', 'AnalyticsAdmin')
  @ApiOperation({ summary: 'Filter organisations by their legal type slug' })
  @ApiQuery({ name: 'type', required: true, example: 'NGO' })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { type: 'array', items: { $ref: getSchemaPath(OrganizationProfileResponseDto) } } } },
      ],
    },
  })
  async getByOrgType(
    @Query('type') typeSlug: string,
  ): Promise<BaseResponseDto<OrganizationProfileResponseDto[]>> {
    this.logger.debug(`API-GW: Filtering organisations by type: ${typeSlug}`);
    return this.organisationService.getOrganisationsByType(typeSlug);
  }

  /**
   * 🔍 Get Organization by UUID
   */
  @Version('1')
  @Get('organisations/:uuid')
  @Roles('SuperAdmin', 'SystemAdmin', 'ComplianceAdmin', 'BusinessSystemAdmin')
  @ApiOperation({ summary: 'Get detailed organisation profile by UUID' })
  @ApiParam({ name: 'uuid', description: 'The unique UUID of the organisation' })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(OrganizationProfileResponseDto) } } },
      ],
    },
  })
  async getByUuid(
    @Param('uuid') uuid: string,
  ): Promise<BaseResponseDto<OrganizationProfileResponseDto>> {
    this.logger.debug(`API-GW: Fetching organisation profile for UUID: ${uuid}`);
    return this.organisationService.getOrganisationByUuid(uuid);
  }
}