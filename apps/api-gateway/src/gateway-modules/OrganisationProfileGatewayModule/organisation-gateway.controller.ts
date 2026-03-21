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
  // Profile Update DTOs
  UpdateOrgProfileRequestDto,
  UpdateEmployerProfileRequestDto,
  UpdateSocialServiceProviderProfileRequestDto,
  UpdateOrganizationPropertyOwnerProfileRequestDto,
  UpdateOrganizationSkilledProfessionalProfileRequestDto,
  UpdateOrganizationIntermediaryAgentProfileRequestDto,
  // Response DTOs
  EmployerProfileResponseDto,
  SocialServiceProviderProfileResponseDto,
  PropertyOwnerProfileResponseDto,
  SkilledProfessionalProfileResponseDto,
  IntermediaryAgentProfileResponseDto,

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
import { ProfileType } from '@pivota-api/constants';

@ApiTags('Organisation')
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
  // Profile Update DTOs
  UpdateOrgProfileRequestDto,
  UpdateEmployerProfileRequestDto,
  UpdateSocialServiceProviderProfileRequestDto,
  UpdateOrganizationPropertyOwnerProfileRequestDto,
  UpdateOrganizationSkilledProfessionalProfileRequestDto,
  UpdateOrganizationIntermediaryAgentProfileRequestDto,
  // Response DTOs
  EmployerProfileResponseDto,
  SocialServiceProviderProfileResponseDto,
  PropertyOwnerProfileResponseDto,
  SkilledProfessionalProfileResponseDto,
  IntermediaryAgentProfileResponseDto,
)
@SetModule('profile')
@Controller('organisation-gateway')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
export class OrganisationGatewayController {
  private readonly logger = new Logger(OrganisationGatewayController.name);

  constructor(
    private readonly organisationService: OrganisationGatewayService,
  ) {}

  // ===========================================================
  // 🏢 ORGANISATION - PROVIDER ONBOARDING
  // ===========================================================

  @Version('1')
  @Patch('organisations/onboard-provider')
  @Roles('SuperAdmin', 'SystemAdmin', 'BusinessSystemAdmin')
  @ApiTags('Organisation - Provider')
  @ApiOperation({ 
    summary: 'Activate Organization Service Provider profile',
    description: `Converts an organization account into a service provider...`
  })
  @ApiBody({ type: OnboardOrganizationProviderRequestDto })
  @ApiResponse({ status: 200, description: 'Organization successfully activated as a provider.' })
  async onboardProvider(
    @Body() dto: OnboardOrganizationProviderRequestDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<ContractorProfileResponseDto>> {
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

  // ===========================================================
  // 📝 ORGANISATION - PROFILE MANAGEMENT
  // ===========================================================

  /**
   * Update Organization Profile
   */
  @Version('1')
  @Patch('organisations/profile')
  @Roles('SuperAdmin', 'SystemAdmin', 'BusinessSystemAdmin')
  @ApiTags('Organisation - Profile')
  @ApiOperation({ 
    summary: 'Update organization profile',
    description: `
      Updates the main organization profile information.
      
      **Microservice:** Profile Service
      **Authentication:** Required (JWT cookie)
      **Permissions:** SuperAdmin, SystemAdmin, BusinessSystemAdmin
      
      **Fields that can be updated:**
      • website - Organization website URL
      • registrationNo - Government registration number
      • kraPin - KRA PIN number
      • physicalAddress - Physical office address
      • organizationType - Legal structure type
      • about - Organization description
      • logo - Logo URL
    `
  })
  @ApiBody({ type: UpdateOrgProfileRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Organization profile updated successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(OrganizationProfileResponseDto) } } }
      ],
    },
  })
  async updateOrganizationProfile(
    @Body() dto: UpdateOrgProfileRequestDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<OrganizationProfileResponseDto>> {
    const accountUuid = req.user.accountId;

    if (!accountUuid) {
      return BaseResponseDto.fail('No account associated with this user', 'BAD_REQUEST');
    }

    this.logger.log(`API-GW: Updating organization profile for account ${accountUuid}`);
    return this.organisationService.updateOrganizationProfile(accountUuid, dto);
  }

  /**
   * Update Employer Profile
   */
  @Version('1')
  @Patch('organisations/employer-profile')
  @Roles('SuperAdmin', 'SystemAdmin', 'BusinessSystemAdmin')
  @ApiTags('Organisation - Profile')
  @ApiOperation({ 
    summary: 'Update employer profile',
    description: `
      Updates the employer/hiring profile for the organization.
      
      **Microservice:** Profile Service
      **Authentication:** Required (JWT cookie)
      **Permissions:** SuperAdmin, SystemAdmin, BusinessSystemAdmin
      
      **Fields that can be updated:**
      • companyName - Company name
      • industry - Industry sector
      • companySize - Size of the company
      • foundedYear - Year company was founded
      • description - Company description
      • logo - Company logo URL
      • preferredSkills - Skills commonly hired for
      • remotePolicy - Remote work policy
      • worksWithAgents - Whether working with recruitment agents
      • preferredAgents - Preferred agent UUIDs
    `
  })
  @ApiBody({ type: UpdateEmployerProfileRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Employer profile updated successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(EmployerProfileResponseDto) } } }
      ],
    },
  })
  async updateEmployerProfile(
    @Body() dto: UpdateEmployerProfileRequestDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<EmployerProfileResponseDto>> {
    const accountUuid = req.user.accountId;

    if (!accountUuid) {
      return BaseResponseDto.fail('No account associated with this user', 'BAD_REQUEST');
    }

    this.logger.log(`API-GW: Updating employer profile for account ${accountUuid}`);
    return this.organisationService.updateEmployerProfile(accountUuid, dto);
  }

  /**
   * Update Social Service Provider Profile
   */
  @Version('1')
  @Patch('organisations/social-service-provider-profile')
  @Roles('SuperAdmin', 'SystemAdmin', 'BusinessSystemAdmin')
  @ApiTags('Organisation - Profile')
  @ApiOperation({ 
    summary: 'Update social service provider profile',
    description: `
      Updates the social service provider profile for the organization.
      
      **Microservice:** Profile Service
      **Authentication:** Required (JWT cookie)
      **Permissions:** SuperAdmin, SystemAdmin, BusinessSystemAdmin
      
      **Fields that can be updated:**
      • providerType - Type of provider (NGO, SOCIAL_ENTERPRISE, etc.)
      • servicesOffered - List of services offered
      • targetBeneficiaries - Target beneficiary groups
      • serviceAreas - Geographic areas served
      • about - Organization description
      • website - Website URL
      • contactEmail - Contact email
      • contactPhone - Contact phone
      • officeHours - Office operating hours
      • physicalAddress - Physical address
      • peopleServed - Number of people served
      • yearEstablished - Year established
      • acceptsDonations - Whether accepts donations
      • needsVolunteers - Whether needs volunteers
      • donationInfo - Donation information
      • volunteerNeeds - Volunteer needs description
    `
  })
  @ApiBody({ type: UpdateSocialServiceProviderProfileRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Social service provider profile updated successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(SocialServiceProviderProfileResponseDto) } } }
      ],
    },
  })
  async updateSocialServiceProviderProfile(
    @Body() dto: UpdateSocialServiceProviderProfileRequestDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<SocialServiceProviderProfileResponseDto>> {
    const accountUuid = req.user.accountId;

    if (!accountUuid) {
      return BaseResponseDto.fail('No account associated with this user', 'BAD_REQUEST');
    }

    this.logger.log(`API-GW: Updating social service provider profile for account ${accountUuid}`);
    return this.organisationService.updateSocialServiceProviderProfile(accountUuid, dto);
  }

  /**
   * Update Property Owner Profile
   */
  @Version('1')
  @Patch('organisations/property-owner-profile')
  @Roles('SuperAdmin', 'SystemAdmin', 'BusinessSystemAdmin')
  @ApiTags('Organisation - Profile')
  @ApiOperation({ 
    summary: 'Update property owner profile',
    description: `
      Updates the property owner profile for the organization.
      
      **Microservice:** Profile Service
      **Authentication:** Required (JWT cookie)
      **Permissions:** SuperAdmin, SystemAdmin, BusinessSystemAdmin
      
      **Fields that can be updated:**
      • isProfessional - Whether a licensed professional
      • licenseNumber - Professional license number
      • companyName - Property management company name
      • yearsInBusiness - Years in business
      • preferredPropertyTypes - Preferred property types to list
      • serviceAreas - Service areas
      • usesAgent - Whether using an agent
      • managingAgentUuid - Managing agent UUID
    `
  })
  @ApiBody({ type: UpdateOrganizationPropertyOwnerProfileRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Property owner profile updated successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(PropertyOwnerProfileResponseDto) } } }
      ],
    },
  })
  async updatePropertyOwnerProfile(
    @Body() dto: UpdateOrganizationPropertyOwnerProfileRequestDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<PropertyOwnerProfileResponseDto>> {
    const accountUuid = req.user.accountId;

    if (!accountUuid) {
      return BaseResponseDto.fail('No account associated with this user', 'BAD_REQUEST');
    }

    this.logger.log(`API-GW: Updating property owner profile for account ${accountUuid}`);
    return this.organisationService.updateOrganizationPropertyOwnerProfile(accountUuid, dto);
  }

  /**
   * Update Skilled Professional Profile
   */
  @Version('1')
  @Patch('organisations/skilled-professional-profile')
  @Roles('SuperAdmin', 'SystemAdmin', 'BusinessSystemAdmin')
  @ApiTags('Organisation - Profile')
  @ApiOperation({ 
    summary: 'Update skilled professional profile',
    description: `
      Updates the skilled professional profile for the organization.
      
      **Microservice:** Profile Service
      **Authentication:** Required (JWT cookie)
      **Permissions:** SuperAdmin, SystemAdmin, BusinessSystemAdmin
      
      **Fields that can be updated:**
      • title - Professional title
      • profession - Profession category
      • specialties - Specialties
      • serviceAreas - Service areas
      • yearsExperience - Years of experience
      • licenseNumber - Professional license number
      • insuranceInfo - Insurance information
      • hourlyRate - Hourly rate
      • dailyRate - Daily rate
      • paymentTerms - Payment terms
      • availableToday - Available for emergency today
      • availableWeekends - Available on weekends
      • emergencyService - Offers emergency service
      • portfolioImages - Portfolio image URLs
      • certifications - Certificate URLs
    `
  })
  @ApiBody({ type: UpdateOrganizationSkilledProfessionalProfileRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Skilled professional profile updated successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(SkilledProfessionalProfileResponseDto) } } }
      ],
    },
  })
  async updateSkilledProfessionalProfile(
    @Body() dto: UpdateOrganizationSkilledProfessionalProfileRequestDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<SkilledProfessionalProfileResponseDto>> {
    const accountUuid = req.user.accountId;

    if (!accountUuid) {
      return BaseResponseDto.fail('No account associated with this user', 'BAD_REQUEST');
    }

    this.logger.log(`API-GW: Updating skilled professional profile for account ${accountUuid}`);
    return this.organisationService.updateOrganizationSkilledProfessionalProfile(accountUuid, dto);
  }

  /**
   * Update Intermediary Agent Profile
   */
  @Version('1')
  @Patch('organisations/intermediary-agent-profile')
  @Roles('SuperAdmin', 'SystemAdmin', 'BusinessSystemAdmin')
  @ApiTags('Organisation - Profile')
  @ApiOperation({ 
    summary: 'Update intermediary agent profile',
    description: `
      Updates the intermediary agent profile for the organization.
      
      **Microservice:** Profile Service
      **Authentication:** Required (JWT cookie)
      **Permissions:** SuperAdmin, SystemAdmin, BusinessSystemAdmin
      
      **Fields that can be updated:**
      • agentType - Type of agent
      • specializations - Specializations
      • serviceAreas - Service areas
      • licenseNumber - License number
      • licenseBody - Licensing body
      • yearsExperience - Years of experience
      • agencyName - Agency name
      • agencyUuid - Agency UUID
      • commissionRate - Commission rate
      • feeStructure - Fee structure
      • minimumFee - Minimum fee
      • typicalFee - Typical fee description
      • about - About the agent
      • profileImage - Profile image URL
      • contactEmail - Contact email
      • contactPhone - Contact phone
      • website - Website URL
      • socialLinks - Social media links
      • clientTypes - Types of clients represented
    `
  })
  @ApiBody({ type: UpdateOrganizationIntermediaryAgentProfileRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Intermediary agent profile updated successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(IntermediaryAgentProfileResponseDto) } } }
      ],
    },
  })
  async updateIntermediaryAgentProfile(
    @Body() dto: UpdateOrganizationIntermediaryAgentProfileRequestDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<IntermediaryAgentProfileResponseDto>> {
    const accountUuid = req.user.accountId;

    if (!accountUuid) {
      return BaseResponseDto.fail('No account associated with this user', 'BAD_REQUEST');
    }

    this.logger.log(`API-GW: Updating intermediary agent profile for account ${accountUuid}`);
    return this.organisationService.updateOrganizationIntermediaryAgentProfile(accountUuid, dto);
  }

  /**
   * Remove Profile
   */
  @Version('1')
  @Delete('organisations/profiles/:profileType')
  @Roles('SuperAdmin', 'SystemAdmin', 'BusinessSystemAdmin')
  @ApiTags('Organisation - Profile')
  @ApiOperation({ 
    summary: 'Remove a profile from the organization',
    description: `
      Removes a specific profile type from the organization account.
      
      **Microservice:** Profile Service
      **Authentication:** Required (JWT cookie)
      **Permissions:** SuperAdmin, SystemAdmin, BusinessSystemAdmin
      
      **Supported Profile Types:**
      • EMPLOYER
      • SOCIAL_SERVICE_PROVIDER
      • PROPERTY_OWNER
      • SKILLED_PROFESSIONAL
      • INTERMEDIARY_AGENT
      
      **What happens:**
      • Profile data is permanently deleted
      • Account activeProfiles list is updated
      • Related files are cleaned up from storage
      • Profile completion percentage is recalculated
      
      **Warning:**
      This action is irreversible. All profile data will be permanently deleted.
    `
  })
  @ApiParam({ 
    name: 'profileType', 
    description: 'Type of profile to remove',
    example: 'EMPLOYER',
    enum: ['EMPLOYER', 'SOCIAL_SERVICE_PROVIDER', 'PROPERTY_OWNER', 'SKILLED_PROFESSIONAL', 'INTERMEDIARY_AGENT']
  })
  @ApiResponse({
    status: 200,
    description: 'Profile removed successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        {
          example: {
            success: true,
            message: 'Profile removed successfully',
            code: 'OK'
          }
        }
      ],
    },
  })
  @ApiResponse({ status: 400, description: 'Unsupported profile type' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async removeProfile(
    @Param('profileType') profileType: ProfileType,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<null>> {
    const accountUuid = req.user.accountId;

    if (!accountUuid) {
      return BaseResponseDto.fail('No account associated with this user', 'BAD_REQUEST');
    }

    this.logger.log(`API-GW: Removing ${profileType} profile from account ${accountUuid}`);
    return this.organisationService.removeProfile(accountUuid, profileType);
  }

  // ===========================================================
  // 📨 ORGANISATION - INVITATION MANAGEMENT
  // ===========================================================

  @Version('1')
  @Post('organisations/members/invite')
  @Roles('SuperAdmin', 'SystemAdmin', 'BusinessSystemAdmin')
  @ApiTags('Organisation - Invitations')
  @ApiOperation({ summary: 'Invite a member to join your organization' })
  @ApiBody({ type: InviteMemberRequestDto })
  @ApiResponse({ status: 201, description: 'Invitation sent successfully' })
  async inviteMember(
    @Body() dto: InviteMemberRequestDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<InviteMemberResponseDto>> {
    const orgUuid = req.user.organizationUuid;
    const invitedByUserUuid = req.user.userUuid;

    if (!orgUuid) {
      if (req.user.accountType !== 'ORGANIZATION') {
        throw BaseResponseDto.fail(
          'Your account is not associated with an organization. Only organization admins can invite members.', 
          'BAD_REQUEST'
        );
      }
      
      this.logger.error(`❌ CRITICAL: User has ORGANIZATION account type but organizationUuid is missing!`);
      throw BaseResponseDto.fail(
        'Token missing organization UUID. Please login again.', 
        'BAD_REQUEST'
      );
    }

    this.logger.log(`API-GW: Admin ${invitedByUserUuid} inviting ${dto.email} to org ${orgUuid}`);
    return this.organisationService.inviteMember(dto, orgUuid, invitedByUserUuid);
  }

  @Version('1')
  @Get('invitations/verify')
  @ApiTags('Organisation - Invitations')
  @ApiOperation({ summary: 'Verify an invitation token' })
  @ApiQuery({ name: 'token', required: true })
  @ApiResponse({ status: 200, description: 'Token is valid' })
  async verifyInvitation(
    @Query('token') token: string,
  ): Promise<BaseResponseDto<InvitationVerificationResponseDto>> {
    this.logger.log(`API-GW: Verifying invitation token: ${token}`);
    return this.organisationService.verifyInvitation({ token });
  }

  @Version('1')
  @Post('invitations/accept')
  @ApiTags('Organisation - Invitations')
  @ApiOperation({ summary: 'Accept an organization invitation' })
  @ApiBody({ type: AcceptInvitationRequestDto })
  @ApiResponse({ status: 200, description: 'Invitation accepted successfully' })
  async acceptInvitation(
    @Body() dto: AcceptInvitationRequestDto,
  ): Promise<BaseResponseDto<AcceptInvitationResponseDto>> {
    this.logger.log(`API-GW: Accepting invitation with token: ${dto.token}`);
    return this.organisationService.acceptInvitation(dto);
  }

  @Version('1')
  @Get('organisations/members/invitations')
  @Roles('SuperAdmin', 'SystemAdmin', 'BusinessSystemAdmin')
  @ApiTags('Organisation - Invitations')
  @ApiOperation({ summary: 'Get all pending invitations' })
  @ApiResponse({ status: 200, description: 'Pending invitations retrieved' })
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

  @Version('1')
  @Post('organisations/members/invitations/:invitationId/resend')
  @Roles('SuperAdmin', 'SystemAdmin', 'BusinessSystemAdmin')
  @ApiTags('Organisation - Invitations')
  @ApiOperation({ summary: 'Resend an invitation' })
  @ApiParam({ name: 'invitationId', description: 'The ID of the invitation to resend' })
  @ApiResponse({ status: 200, description: 'Invitation resent successfully' })
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

  @Version('1')
  @Delete('organisations/members/invitations/:invitationId')
  @Roles('SuperAdmin', 'SystemAdmin', 'BusinessSystemAdmin')
  @ApiTags('Organisation - Invitations')
  @ApiOperation({ summary: 'Cancel a pending invitation' })
  @ApiParam({ name: 'invitationId', description: 'The ID of the invitation to cancel' })
  @ApiResponse({ status: 200, description: 'Invitation cancelled successfully' })
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

  @Version('1')
  @Get('invitations/check-status')
  @ApiTags('Organisation - Invitations')
  @ApiOperation({ summary: 'Check if an email has a pending invitation' })
  @ApiQuery({ name: 'email', required: true })
  @ApiResponse({ status: 200, description: 'Status retrieved successfully' })
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

  // ===========================================================
  // 🔍 ORGANISATION - PUBLIC DISCOVERY
  // ===========================================================

  @Version('1')
  @Get('organisations/filter')
  @Roles('SuperAdmin', 'SystemAdmin', 'ComplianceAdmin', 'AnalyticsAdmin')
  @ApiTags('Organisation - Discovery')
  @ApiOperation({ summary: 'Filter organisations by their legal type slug' })
  @ApiQuery({ name: 'type', required: true })
  @ApiResponse({ status: 200, description: 'Organizations retrieved successfully' })
  async getByOrgType(
    @Query('type') typeSlug: string,
  ): Promise<BaseResponseDto<OrganizationProfileResponseDto[]>> {
    this.logger.debug(`API-GW: Filtering organisations by type: ${typeSlug}`);
    return this.organisationService.getOrganizationsByType(typeSlug);
  }

  @Version('1')
  @Get('organisations/:uuid')
  @Roles('SuperAdmin', 'SystemAdmin', 'ComplianceAdmin', 'BusinessSystemAdmin')
  @ApiTags('Organisation - Discovery')
  @ApiOperation({ summary: 'Get detailed organisation profile by UUID' })
  @ApiParam({ name: 'uuid', description: 'The unique UUID of the organisation' })
  @ApiResponse({ status: 200, description: 'Organization retrieved successfully' })
  async getByUuid(
    @Param('uuid') uuid: string,
  ): Promise<BaseResponseDto<OrganizationProfileResponseDto>> {
    this.logger.debug(`API-GW: Fetching organisation profile for UUID: ${uuid}`);
    return this.organisationService.getOrganizationByUuid(uuid);
  }
}