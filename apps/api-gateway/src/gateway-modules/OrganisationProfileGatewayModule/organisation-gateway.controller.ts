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

@ApiTags('Organisation') // Main module tag
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

  // ===========================================================
  // 🏢 ORGANISATION - PROVIDER ONBOARDING
  // ===========================================================

  /**
   * Onboard Organization as Service Provider
   * 
   * Activates an organization account as a service provider, allowing them to
   * create service offerings and appear in discovery searches.
   * 
   * @param dto - Provider onboarding details (specialties, service areas, experience)
   * @param req - JWT request containing organization UUID
   * @returns Activated contractor profile
   */
  @Version('1')
  @Patch('organisations/onboard-provider')
  @Roles('SuperAdmin', 'SystemAdmin', 'BusinessSystemAdmin')
  @ApiTags('Organisation - Provider')
  @ApiOperation({ 
    summary: 'Activate Organization Service Provider profile',
    description: `
      Converts an organization account into a service provider, enabling them to:
      • Create service offerings visible in discovery searches
      • Receive bookings from clients
      • Manage service listings
      • Build reputation through reviews
      
      **Microservice:** Profile Service
      **Authentication:** Required (JWT cookie)
      **Permissions:** SuperAdmin, SystemAdmin, BusinessSystemAdmin
      
      **Process:**
      1. Validates organization exists and is active
      2. Creates contractor profile linked to the organization
      3. Enables service offering creation
      4. Updates profile completion status
      
      **Required Information:**
      • **specialties** - List of professional specialties (e.g., ["Plumbing", "Electrical"])
      • **serviceAreas** - Geographic areas served (e.g., ["Nairobi", "Kiambu"])
      • **yearsExperience** - Years of operation
      
      **Security Note:**
      Organization UUID is extracted directly from the JWT token for security.
      No need to pass organization ID in the request body.
    `
  })
  @ApiBody({ 
    type: OnboardOrganizationProviderRequestDto,
    examples: {
      'Construction Company': {
        value: {
          specialties: ['General Contracting', 'Renovations', 'Commercial Construction'],
          serviceAreas: ['Nairobi', 'Kiambu', 'Machakos'],
          yearsExperience: 15
        }
      },
      'Cleaning Services': {
        value: {
          specialties: ['Office Cleaning', 'Deep Cleaning', 'Carpet Cleaning'],
          serviceAreas: ['Nairobi CBD', 'Westlands', 'Kilimani'],
          yearsExperience: 8
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Organization successfully activated as a provider.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { 
          properties: { 
            data: { 
              $ref: getSchemaPath(ContractorProfileResponseDto),
              example: {
                uuid: 'prof_123abc',
                accountId: 'acc_456def',
                specialties: ['General Contracting', 'Renovations'],
                serviceAreas: ['Nairobi', 'Kiambu'],
                yearsExperience: 15,
                isVerified: false,
                averageRating: 0,
                totalReviews: 0,
                createdAt: '2026-03-05T10:30:00.000Z'
              }
            } 
          } 
        },
      ],
    },
  })
  @ApiResponse({ status: 400, description: 'No organization associated with this account' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid JWT token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 409, description: 'Organization already has a provider profile' })
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

  // ===========================================================
  // 📨 ORGANISATION - INVITATION MANAGEMENT
  // ===========================================================

  /**
   * Invite a member to join the organization
   * 
   * Sends an email invitation to a new member to join the organization.
   * 
   * @param dto - Invitation details (email, optional message)
   * @param req - JWT request containing organization UUID
   * @returns Invitation details with token
   */
  @Version('1')
  @Post('organisations/members/invite')
  @Roles('SuperAdmin', 'SystemAdmin', 'BusinessSystemAdmin')
  @ApiTags('Organisation - Invitations')
  @ApiOperation({ 
    summary: 'Invite a member to join your organization',
    description: `
      Sends an email invitation to join the organization.
      
      **Microservice:** Profile Service
      **Authentication:** Required (JWT cookie)
      **Permissions:** SuperAdmin, SystemAdmin, BusinessSystemAdmin
      
      **Invitation Flow:**
      1. Admin sends invitation to email address
      2. System generates unique token and stores pending invitation
      3. Email sent with acceptance link containing token
      4. Recipient accepts via public endpoint
      5. On acceptance, user is added to organization team
      
      **Email Types:**
      • **New users** - Receive signup link + invitation token
      • **Existing users** - Receive direct acceptance link
      
      **Security:**
      • Tokens expire after 7 days
      • Each email can have only one pending invitation per organization
      • Tokens are one-time use only
      
      **Notes:**
      • Role is automatically set to GeneralUser (customizable in future)
      • Inviter information is tracked for audit purposes
    `
  })
  @ApiBody({ 
    type: InviteMemberRequestDto,
    examples: {
      'Invite new team member': {
        value: {
          email: 'john.doe@example.com',
          message: 'We would like you to join our organization as a service provider.'
        }
      },
      'Invite with custom message': {
        value: {
          email: 'jane.smith@example.com',
          message: 'Please join our team to help manage our growing portfolio.'
        }
      }
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Invitation sent successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { 
          properties: { 
            data: { 
              $ref: getSchemaPath(InviteMemberResponseDto),
              example: {
                invitationId: 'inv_123abc',
                email: 'john.doe@example.com',
                status: 'PENDING',
                expiresAt: '2026-03-12T10:30:00.000Z'
              }
            } 
          } 
        },
      ],
    },
  })
  @ApiResponse({ status: 400, description: 'No organization associated with this account' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 409, description: 'Invitation already pending for this email' })
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

  /**
   * Verify an invitation token
   * 
   * Public endpoint to validate an invitation token before showing the acceptance form.
   * 
   * @param token - Invitation token from email
   * @returns Invitation details if valid
   */
  @Version('1')
  @Get('invitations/verify')
  @ApiTags('Organisation - Invitations')
  @ApiOperation({ 
    summary: 'Verify an invitation token',
    description: `
      Public endpoint to check if an invitation token is valid before showing the acceptance form.
      
      **Microservice:** Profile Service
      **Authentication:** Not required
      
      **Validation Checks:**
      • Token exists in database
      • Token has not expired
      • Invitation is still pending (not accepted/cancelled)
      • Organization still exists and is active
      
      **Response includes:**
      • Organization name and details
      • Inviter information
      • Whether user needs to sign up (new user) or can accept directly (existing user)
      
      **Use Case:**
      Call this endpoint when a user clicks the invitation link to:
      • Validate the token is still valid
      • Show organization details on acceptance page
      • Determine if signup or login is needed
    `
  })
  @ApiQuery({ 
    name: 'token', 
    required: true, 
    description: 'The invitation token from the email',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  @ApiResponse({
    status: 200,
    description: 'Token is valid',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { 
          properties: { 
            data: { 
              $ref: getSchemaPath(InvitationVerificationResponseDto),
              example: {
                isValid: true,
                organizationName: 'Pivota Properties Ltd',
                organizationUuid: 'org_123abc',
                inviterName: 'John Admin',
                inviterEmail: 'admin@company.com',
                email: 'invited@example.com',
                userExists: false,
                expiresAt: '2026-03-12T10:30:00.000Z'
              }
            } 
          } 
        },
      ],
    },
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Token is invalid or expired',
    schema: {
      example: {
        success: false,
        message: 'Invitation token is invalid or has expired',
        code: 'INVALID_TOKEN'
      }
    }
  })
  async verifyInvitation(
    @Query('token') token: string,
  ): Promise<BaseResponseDto<InvitationVerificationResponseDto>> {
    this.logger.log(`API-GW: Verifying invitation token: ${token}`);
    return this.organisationService.verifyInvitation({ token });
  }

  /**
   * Accept an invitation
   * 
   * Public endpoint to accept an invitation and join the organization.
   * 
   * @param dto - Acceptance details including token and user information
   * @returns Acceptance confirmation with access details
   */
  @Version('1')
  @Post('invitations/accept')
  @ApiTags('Organisation - Invitations')
  @ApiOperation({ 
    summary: 'Accept an organization invitation',
    description: `
      Public endpoint to accept an invitation and join the organization.
      
      **Microservice:** Profile Service
      **Authentication:** Not required (handles both new and existing users)
      
      **Two Scenarios:**
      
      **1. New User (no account):**
      • Provide firstName, lastName, phone
      • System creates new user account
      • User is added to organization
      • Password setup email is sent
      
      **2. Existing User (has account):**
      • No additional personal info needed
      • User is immediately added to organization
      • Welcome email is sent
      
      **Process:**
      1. Validates invitation token
      2. Creates/updates user account as needed
      3. Adds user to organization team
      4. Marks invitation as accepted
      5. Sends appropriate confirmation email
      6. Returns access token for automatic login
      
      **Security:**
      • Tokens are one-time use only
      • Invitation becomes invalid after acceptance
      • User is automatically logged in after acceptance
    `
  })
  @ApiBody({ 
    type: AcceptInvitationRequestDto,
    examples: {
      'New user accepting': {
        value: {
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          firstName: 'John',
          lastName: 'Doe',
          phone: '+254712345678'
        }
      },
      'Existing user accepting': {
        value: {
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Invitation accepted successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { 
          properties: { 
            data: { 
              $ref: getSchemaPath(AcceptInvitationResponseDto),
              example: {
                success: true,
                userUuid: 'usr_123abc',
                organizationUuid: 'org_456def',
                organizationName: 'Pivota Properties Ltd',
                isNewUser: false,
                accessToken: 'eyJhbGciOiJIUzI1NiIs...'
              }
            } 
          } 
        },
      ],
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @ApiResponse({ status: 409, description: 'User already a member of this organization' })
  async acceptInvitation(
    @Body() dto: AcceptInvitationRequestDto,
  ): Promise<BaseResponseDto<AcceptInvitationResponseDto>> {
    this.logger.log(`API-GW: Accepting invitation with token: ${dto.token}`);
    return this.organisationService.acceptInvitation(dto);
  }

  /**
   * Get all pending invitations
   * 
   * Retrieves all pending invitations for the current organization.
   * 
   * @param req - JWT request containing organization UUID
   * @returns List of pending invitations
   */
  @Version('1')
  @Get('organisations/members/invitations')
  @Roles('SuperAdmin', 'SystemAdmin', 'BusinessSystemAdmin')
  @ApiTags('Organisation - Invitations')
  @ApiOperation({ 
    summary: 'Get all pending invitations',
    description: `
      Returns a list of all pending invitations for the current organization.
      
      **Microservice:** Profile Service
      **Authentication:** Required (JWT cookie)
      **Permissions:** SuperAdmin, SystemAdmin, BusinessSystemAdmin
      
      **Information returned:**
      • Invited email address
      • Invitation status (PENDING, ACCEPTED, EXPIRED, CANCELLED)
      • Date sent
      • Expiration date
      • Inviter details
      • Resend count
      
      **Use Cases:**
      • Monitor pending invitations
      • Resend expired invitations
      • Cancel incorrect invitations
      • Track invitation acceptance rates
    `
  })
  @ApiResponse({
    status: 200,
    description: 'Pending invitations retrieved',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { 
          properties: { 
            data: { 
              type: 'array', 
              items: { $ref: getSchemaPath(InvitationDetailsResponseDto) },
              example: [
                {
                  id: 'inv_123abc',
                  email: 'john.doe@example.com',
                  status: 'PENDING',
                  createdAt: '2026-03-01T10:30:00.000Z',
                  expiresAt: '2026-03-08T10:30:00.000Z',
                  invitedBy: 'admin@company.com',
                  resendCount: 0
                },
                {
                  id: 'inv_456def',
                  email: 'jane.smith@example.com',
                  status: 'PENDING',
                  createdAt: '2026-03-02T14:20:00.000Z',
                  expiresAt: '2026-03-09T14:20:00.000Z',
                  invitedBy: 'admin@company.com',
                  resendCount: 1
                }
              ]
            } 
          } 
        },
      ],
    },
  })
  @ApiResponse({ status: 400, description: 'No organization associated with this account' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
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
   * Resend an invitation
   * 
   * Generates a new token and sends a new invitation email.
   * 
   * @param invitationId - ID of the invitation to resend
   * @param req - JWT request containing organization UUID
   * @returns Success confirmation
   */
  @Version('1')
  @Post('organisations/members/invitations/:invitationId/resend')
  @Roles('SuperAdmin', 'SystemAdmin', 'BusinessSystemAdmin')
  @ApiTags('Organisation - Invitations')
  @ApiOperation({ 
    summary: 'Resend an invitation',
    description: `
      Generates a new token and sends a new invitation email.
      
      **Microservice:** Profile Service
      **Authentication:** Required (JWT cookie)
      **Permissions:** SuperAdmin, SystemAdmin, BusinessSystemAdmin
      
      **When to use:**
      • Invitation expired
      • User didn't receive the email
      • User lost the invitation link
      
      **What happens:**
      1. Creates new token (old token becomes invalid)
      2. Updates expiration date (resets 7-day timer)
      3. Sends new email with updated link
      4. Increments resend count for tracking
      
      **Limitations:**
      • Can only resend pending invitations
      • Maximum 3 resends per invitation (prevents abuse)
    `
  })
  @ApiParam({ 
    name: 'invitationId', 
    description: 'The ID of the invitation to resend',
    example: 'inv_123abc'
  })
  @ApiResponse({
    status: 200,
    description: 'Invitation resent successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        {
          example: {
            success: true,
            message: 'Invitation resent successfully',
            code: 'OK'
          }
        }
      ],
    },
  })
  @ApiResponse({ status: 400, description: 'No organization associated with this account' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  @ApiResponse({ status: 409, description: 'Maximum resend attempts reached' })
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
   * Cancel a pending invitation
   * 
   * Cancels a pending invitation, making the token invalid.
   * 
   * @param invitationId - ID of the invitation to cancel
   * @param req - JWT request containing organization UUID
   * @returns Success confirmation
   */
  @Version('1')
  @Delete('organisations/members/invitations/:invitationId')
  @Roles('SuperAdmin', 'SystemAdmin', 'BusinessSystemAdmin')
  @ApiTags('Organisation - Invitations')
  @ApiOperation({ 
    summary: 'Cancel a pending invitation',
    description: `
      Cancels a pending invitation, making the token invalid.
      
      **Microservice:** Profile Service
      **Authentication:** Required (JWT cookie)
      **Permissions:** SuperAdmin, SystemAdmin, BusinessSystemAdmin
      
      **When to use:**
      • Invited wrong person
      • Role changed and need to reinvite with different permissions
      • User no longer needs access
      
      **What happens:**
      1. Invitation status changes to CANCELLED
      2. Token becomes invalid immediately
      3. No further actions possible with this invitation
      4. Audit log records cancellation reason and who cancelled
      
      **Note:**
      • Cancelled invitations cannot be reactivated
      • Create a new invitation if needed
    `
  })
  @ApiParam({ 
    name: 'invitationId', 
    description: 'The ID of the invitation to cancel',
    example: 'inv_123abc'
  })
  @ApiResponse({
    status: 200,
    description: 'Invitation cancelled successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        {
          example: {
            success: true,
            message: 'Invitation cancelled successfully',
            code: 'OK'
          }
        }
      ],
    },
  })
  @ApiResponse({ status: 400, description: 'No organization associated with this account' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  @ApiResponse({ status: 409, description: 'Invitation already accepted or expired' })
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
   * Check if an email has a pending invitation
   * 
   * Quick check to see if a specific email has a pending invitation.
   * 
   * @param email - Email address to check
   * @param req - JWT request containing organization UUID
   * @returns Invitation status
   */
  @Version('1')
  @Get('invitations/check-status')
  @ApiTags('Organisation - Invitations')
  @ApiOperation({ 
    summary: 'Check if an email has a pending invitation',
    description: `
      Quick check to see if a specific email has a pending invitation for this organization.
      
      **Microservice:** Profile Service
      **Authentication:** Required (JWT cookie)
      
      **Use Cases:**
      • UI validation before sending new invitation
      • Check if user has already been invited
      • Prevent duplicate invitations
      • Show invitation status in admin panel
      
      **Response:**
      • **hasPendingInvitation** - Whether there's an active invitation
      • **invitationId** - ID if pending (for UI actions)
      • **status** - Current status (PENDING, ACCEPTED, etc.)
      • **expiresAt** - Expiration date if pending
    `
  })
  @ApiQuery({ 
    name: 'email', 
    required: true, 
    description: 'Email address to check',
    example: 'john.doe@example.com'
  })
  @ApiResponse({
    status: 200,
    description: 'Status retrieved successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { 
          properties: { 
            data: { 
              $ref: getSchemaPath(CheckInvitationStatusResponseDto),
              example: {
                hasPendingInvitation: true,
                invitationId: 'inv_123abc',
                status: 'PENDING',
                expiresAt: '2026-03-12T10:30:00.000Z'
              }
            } 
          } 
        },
      ],
    },
  })
  @ApiResponse({ status: 400, description: 'No organization associated with this account' })
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

  /**
   * Get Organizations by Type
   * 
   * Filters organizations by their legal type slug.
   * 
   * @param typeSlug - Organization type slug (e.g., 'NGO', 'PRIVATE_LIMITED')
   * @returns List of organizations matching the type
   */
  @Version('1')
  @Get('organisations/filter')
  @Roles('SuperAdmin', 'SystemAdmin', 'ComplianceAdmin', 'AnalyticsAdmin')
  @ApiTags('Organisation - Discovery')
  @ApiOperation({ 
    summary: 'Filter organisations by their legal type slug',
    description: `
      Retrieves organizations filtered by their legal/business type.
      
      **Microservice:** Profile Service
      **Authentication:** Required (JWT cookie)
      **Permissions:** SuperAdmin, SystemAdmin, ComplianceAdmin, AnalyticsAdmin
      
      **Organization Types:**
      • **NGO** - Non-Governmental Organization
      • **PRIVATE_LIMITED** - Private Limited Company
      • **PUBLIC_LIMITED** - Public Limited Company
      • **SOLE_PROPRIETORSHIP** - Sole Proprietorship
      • **PARTNERSHIP** - Partnership
      • **TRUST** - Trust
      • **COOPERATIVE** - Cooperative Society
      
      **Use Cases:**
      • Compliance reporting
      • Analytics by organization type
      • Market research
      • Regulatory audits
      
      **Response includes:**
      • Organization profile details
      • Verification status
      • Registration numbers
      • Contact information
    `
  })
  @ApiQuery({ 
    name: 'type', 
    required: true, 
    example: 'NGO',
    description: 'Organization type slug'
  })
  @ApiResponse({
    status: 200,
    description: 'Organizations retrieved successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { 
          properties: { 
            data: { 
              type: 'array', 
              items: { $ref: getSchemaPath(OrganizationProfileResponseDto) },
              example: [
                {
                  uuid: 'org_123abc',
                  name: 'Save the Children Kenya',
                  type: 'NGO',
                  verificationStatus: 'VERIFIED',
                  officialEmail: 'info@savethechildren.ke',
                  officialPhone: '+254207123456',
                  registrationNo: 'NGO/2025/0123'
                }
              ]
            } 
          } 
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getByOrgType(
    @Query('type') typeSlug: string,
  ): Promise<BaseResponseDto<OrganizationProfileResponseDto[]>> {
    this.logger.debug(`API-GW: Filtering organisations by type: ${typeSlug}`);
    return this.organisationService.getOrganisationsByType(typeSlug);
  }

  /**
   * Get Organization by UUID
   * 
   * Retrieves detailed organization profile by UUID.
   * 
   * @param uuid - Organization UUID
   * @returns Detailed organization profile
   */
  @Version('1')
  @Get('organisations/:uuid')
  @Roles('SuperAdmin', 'SystemAdmin', 'ComplianceAdmin', 'BusinessSystemAdmin')
  @ApiTags('Organisation - Discovery')
  @ApiOperation({ 
    summary: 'Get detailed organisation profile by UUID',
    description: `
      Retrieves complete organization profile including all metadata.
      
      **Microservice:** Profile Service
      **Authentication:** Required (JWT cookie)
      **Permissions:** SuperAdmin, SystemAdmin, ComplianceAdmin, BusinessSystemAdmin
      
      **Information returned:**
      • Basic info (name, type, status)
      • Verification details
      • Contact information
      • Registration documents
      • Team members
      • Provider profile (if applicable)
      • Subscription details
      
      **Use Cases:**
      • Customer support viewing organization details
      • Compliance verification
      • Audit trails
      • Detailed reporting
    `
  })
  @ApiParam({ 
    name: 'uuid', 
    description: 'The unique UUID of the organisation',
    example: 'org_123abc'
  })
  @ApiResponse({
    status: 200,
    description: 'Organization retrieved successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { 
          properties: { 
            data: { 
              $ref: getSchemaPath(OrganizationProfileResponseDto),
              example: {
                uuid: 'org_123abc',
                name: 'Pivota Properties Ltd',
                type: 'PRIVATE_LIMITED',
                verificationStatus: 'VERIFIED',
                officialEmail: 'info@pivotaproperties.com',
                officialPhone: '+254207123456',
                website: 'https://pivotaproperties.com',
                registrationNo: 'PRV/2024/0789',
                kraPin: 'P051234567K',
                physicalAddress: 'ABC Towers, 14th Floor, Nairobi',
                createdAt: '2024-01-15T00:00:00.000Z',
                isVerified: true,
                verifiedFeatures: ['BUSINESS_REGISTRATION', 'KRA_PIN']
              }
            } 
          } 
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async getByUuid(
    @Param('uuid') uuid: string,
  ): Promise<BaseResponseDto<OrganizationProfileResponseDto>> {
    this.logger.debug(`API-GW: Fetching organisation profile for UUID: ${uuid}`);
    return this.organisationService.getOrganisationByUuid(uuid);
  }
}