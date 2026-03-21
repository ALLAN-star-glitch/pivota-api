import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { ProfileType } from '@pivota-api/constants';
import { 
  BaseResponseDto, 
  OrganizationProfileResponseDto,
  AddOrgMemberRequestDto,
  // NEW DTOs
  OnboardOrgProviderGrpcRequestDto,
  ContractorProfileResponseDto,
  // Invitation DTOs
  InviteMemberRequestDto,
  InviteMemberResponseDto,
  VerifyInvitationRequestDto,
  InvitationVerificationResponseDto,
  AcceptInvitationRequestDto,
  AcceptInvitationResponseDto,
  GetOrganizationInvitationsRequestDto,
  InvitationDetailsResponseDto,
  ResendInvitationRequestDto,
  CancelInvitationRequestDto,
  CheckInvitationStatusRequestDto,
  CheckInvitationStatusResponseDto,
  // Organization Profile Update DTOs
  UpdateOrgProfileRequestDto,
  UpdateEmployerProfileRequestDto,
  UpdateSocialServiceProviderProfileRequestDto,
  UpdateOrganizationPropertyOwnerProfileRequestDto,
  UpdateOrganizationSkilledProfessionalProfileRequestDto,
  UpdateOrganizationIntermediaryAgentProfileRequestDto,
  // Profile Data DTOs
  EmployerProfileDataDto,
  SocialServiceProviderProfileDataDto,
  PropertyOwnerProfileDataDto,
  SkilledProfessionalProfileDataDto,
  IntermediaryAgentProfileDataDto,
  // Response DTOs
  EmployerProfileResponseDto,
  SocialServiceProviderProfileResponseDto,
  PropertyOwnerProfileResponseDto,
  SkilledProfessionalProfileResponseDto,
  IntermediaryAgentProfileResponseDto,
} from '@pivota-api/dtos';
import { firstValueFrom, Observable } from 'rxjs';

// ---------------- gRPC Interface ----------------
interface OrganisationServiceGrpc {
  // Organization Onboarding
  CreateOrganizationAccountWithProfiles(
    data: any // CreateOrganisationRequestDto
  ): Observable<BaseResponseDto<OrganizationProfileResponseDto>>;
  
  // Organization Profile Creation
  CreateEmployerProfile(
    data: { accountUuid: string; data: EmployerProfileDataDto }
  ): Observable<BaseResponseDto<EmployerProfileResponseDto>>;
  
  CreateSocialServiceProviderProfile(
    data: { accountUuid: string; data: SocialServiceProviderProfileDataDto }
  ): Observable<BaseResponseDto<SocialServiceProviderProfileResponseDto>>;
  
  CreateOrganizationPropertyOwnerProfile(
    data: { accountUuid: string; data: PropertyOwnerProfileDataDto }
  ): Observable<BaseResponseDto<PropertyOwnerProfileResponseDto>>;
  
  CreateOrganizationSkilledProfessionalProfile(
    data: { accountUuid: string; data: SkilledProfessionalProfileDataDto }
  ): Observable<BaseResponseDto<SkilledProfessionalProfileResponseDto>>;
  
  CreateOrganizationIntermediaryAgentProfile(
    data: { accountUuid: string; data: IntermediaryAgentProfileDataDto }
  ): Observable<BaseResponseDto<IntermediaryAgentProfileResponseDto>>;
  
  // Organization Retrieval
  GetOrganizationByUuid(
    data: { orgUuid: string },
  ): Observable<BaseResponseDto<OrganizationProfileResponseDto>>;
  
  GetOrganizationByAccountUuid(
    data: { accountUuid: string },
  ): Observable<BaseResponseDto<OrganizationProfileResponseDto>>;
  
  GetOrganizationsByType(
    data: { typeSlug: string },
  ): Observable<BaseResponseDto<OrganizationProfileResponseDto[]>>;
  
  // Organization Profile Updates
  UpdateOrganizationProfile(
    data: UpdateOrgProfileRequestDto & { accountUuid: string }
  ): Observable<BaseResponseDto<OrganizationProfileResponseDto>>;
  
  UpdateEmployerProfile(
    data: UpdateEmployerProfileRequestDto & { accountUuid: string }
  ): Observable<BaseResponseDto<EmployerProfileResponseDto>>;
  
  UpdateSocialServiceProviderProfile(
    data: UpdateSocialServiceProviderProfileRequestDto & { accountUuid: string }
  ): Observable<BaseResponseDto<SocialServiceProviderProfileResponseDto>>;
  
  UpdateOrganizationPropertyOwnerProfile(
    data: UpdateOrganizationPropertyOwnerProfileRequestDto & { accountUuid: string }
  ): Observable<BaseResponseDto<PropertyOwnerProfileResponseDto>>;
  
  UpdateOrganizationSkilledProfessionalProfile(
    data: UpdateOrganizationSkilledProfessionalProfileRequestDto & { accountUuid: string }
  ): Observable<BaseResponseDto<SkilledProfessionalProfileResponseDto>>;
  
  UpdateOrganizationIntermediaryAgentProfile(
    data: UpdateOrganizationIntermediaryAgentProfileRequestDto & { accountUuid: string }
  ): Observable<BaseResponseDto<IntermediaryAgentProfileResponseDto>>;
  
  // Remove Profile
  RemoveProfile(
    data: { accountUuid: string; profileType: ProfileType }
  ): Observable<BaseResponseDto<null>>;
  
  // Membership
  AddOrganizationMember(
    data: AddOrgMemberRequestDto,
  ): Observable<BaseResponseDto<null>>;
  
  // Provider Onboarding
  OnboardOrganizationProvider(
    data: OnboardOrgProviderGrpcRequestDto
  ): Observable<BaseResponseDto<ContractorProfileResponseDto>>;
  
  // Invitation Methods
  InviteMember(
    data: InviteMemberRequestDto & { 
      organizationUuid: string; 
      invitedByUserUuid: string;
    }
  ): Observable<BaseResponseDto<InviteMemberResponseDto>>;
  
  VerifyInvitation(
    data: VerifyInvitationRequestDto
  ): Observable<BaseResponseDto<InvitationVerificationResponseDto>>;
  
  AcceptInvitation(
    data: AcceptInvitationRequestDto
  ): Observable<BaseResponseDto<AcceptInvitationResponseDto>>;
  
  GetOrganizationInvitations(
    data: GetOrganizationInvitationsRequestDto
  ): Observable<BaseResponseDto<InvitationDetailsResponseDto[]>>;
  
  ResendInvitation(
    data: ResendInvitationRequestDto & {
      requestedByUserUuid: string;
      organizationUuid: string;
    }
  ): Observable<BaseResponseDto<null>>;
  
  CancelInvitation(
    data: CancelInvitationRequestDto & {
      requestedByUserUuid: string;
      organizationUuid: string;
    }
  ): Observable<BaseResponseDto<null>>;
  
  CheckInvitationStatus(
    data: CheckInvitationStatusRequestDto
  ): Observable<BaseResponseDto<CheckInvitationStatusResponseDto>>;
}

@Injectable()
export class OrganisationGatewayService {
  private readonly logger = new Logger(OrganisationGatewayService.name);
  private grpcService: OrganisationServiceGrpc;

  constructor(
    @Inject('PROFILE_PACKAGE') private readonly grpcClient: ClientGrpc,
  ) {
    this.grpcService = this.grpcClient.getService<OrganisationServiceGrpc>('ProfileService');
  }

  // ======================================================
  // ORGANIZATION ONBOARDING
  // ======================================================

  async createOrganizationAccountWithProfiles(
    data: any
  ): Promise<BaseResponseDto<OrganizationProfileResponseDto>> {
    this.logger.log(`Gateway → Creating organization account: ${data.organizationName}`);

    try {
      const res = await firstValueFrom(
        this.grpcService.CreateOrganizationAccountWithProfiles(data)
      );

      if (res && res.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(
        res.message || 'Organization creation failed',
        res.code || 'INTERNAL_ERROR'
      );
    } catch (error) {
      this.logger.error(`gRPC Error during organization creation: ${error.message}`);
      return BaseResponseDto.fail('Profile Service communication error', 'SERVICE_UNAVAILABLE');
    }
  }

  // ======================================================
  // ORGANIZATION PROFILE CREATION
  // ======================================================

  async createEmployerProfile(
    accountUuid: string,
    data: EmployerProfileDataDto
  ): Promise<BaseResponseDto<EmployerProfileResponseDto>> {
    this.logger.log(`Gateway → Creating employer profile for account: ${accountUuid}`);

    try {
      const res = await firstValueFrom(
        this.grpcService.CreateEmployerProfile({ accountUuid, data })
      );

      if (res && res.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(
        res.message || 'Employer profile creation failed',
        res.code || 'INTERNAL_ERROR'
      );
    } catch (error) {
      this.logger.error(`gRPC Error creating employer profile: ${error.message}`);
      return BaseResponseDto.fail('Profile Service communication error', 'SERVICE_UNAVAILABLE');
    }
  }

  async createSocialServiceProviderProfile(
    accountUuid: string,
    data: SocialServiceProviderProfileDataDto
  ): Promise<BaseResponseDto<SocialServiceProviderProfileResponseDto>> {
    this.logger.log(`Gateway → Creating social service provider profile for account: ${accountUuid}`);

    try {
      const res = await firstValueFrom(
        this.grpcService.CreateSocialServiceProviderProfile({ accountUuid, data })
      );

      if (res && res.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(
        res.message || 'Social service provider profile creation failed',
        res.code || 'INTERNAL_ERROR'
      );
    } catch (error) {
      this.logger.error(`gRPC Error creating social service provider profile: ${error.message}`);
      return BaseResponseDto.fail('Profile Service communication error', 'SERVICE_UNAVAILABLE');
    }
  }

  async createOrganizationPropertyOwnerProfile(
    accountUuid: string,
    data: PropertyOwnerProfileDataDto
  ): Promise<BaseResponseDto<PropertyOwnerProfileResponseDto>> {
    this.logger.log(`Gateway → Creating property owner profile for account: ${accountUuid}`);

    try {
      const res = await firstValueFrom(
        this.grpcService.CreateOrganizationPropertyOwnerProfile({ accountUuid, data })
      );

      if (res && res.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(
        res.message || 'Property owner profile creation failed',
        res.code || 'INTERNAL_ERROR'
      );
    } catch (error) {
      this.logger.error(`gRPC Error creating property owner profile: ${error.message}`);
      return BaseResponseDto.fail('Profile Service communication error', 'SERVICE_UNAVAILABLE');
    }
  }

  async createOrganizationSkilledProfessionalProfile(
    accountUuid: string,
    data: SkilledProfessionalProfileDataDto
  ): Promise<BaseResponseDto<SkilledProfessionalProfileResponseDto>> {
    this.logger.log(`Gateway → Creating skilled professional profile for account: ${accountUuid}`);

    try {
      const res = await firstValueFrom(
        this.grpcService.CreateOrganizationSkilledProfessionalProfile({ accountUuid, data })
      );

      if (res && res.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(
        res.message || 'Skilled professional profile creation failed',
        res.code || 'INTERNAL_ERROR'
      );
    } catch (error) {
      this.logger.error(`gRPC Error creating skilled professional profile: ${error.message}`);
      return BaseResponseDto.fail('Profile Service communication error', 'SERVICE_UNAVAILABLE');
    }
  }

  async createOrganizationIntermediaryAgentProfile(
    accountUuid: string,
    data: IntermediaryAgentProfileDataDto
  ): Promise<BaseResponseDto<IntermediaryAgentProfileResponseDto>> {
    this.logger.log(`Gateway → Creating intermediary agent profile for account: ${accountUuid}`);

    try {
      const res = await firstValueFrom(
        this.grpcService.CreateOrganizationIntermediaryAgentProfile({ accountUuid, data })
      );

      if (res && res.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(
        res.message || 'Intermediary agent profile creation failed',
        res.code || 'INTERNAL_ERROR'
      );
    } catch (error) {
      this.logger.error(`gRPC Error creating intermediary agent profile: ${error.message}`);
      return BaseResponseDto.fail('Profile Service communication error', 'SERVICE_UNAVAILABLE');
    }
  }

  // ======================================================
  // ORGANIZATION RETRIEVAL
  // ======================================================

  async getOrganizationByUuid(orgUuid: string): Promise<BaseResponseDto<OrganizationProfileResponseDto>> {
    this.logger.log(`Gateway → Fetching organization: ${orgUuid}`);
    
    try {
      const res = await firstValueFrom(this.grpcService.GetOrganizationByUuid({ orgUuid }));
      
      if (res && res.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }
      return BaseResponseDto.fail(res.message || 'Organization not found', res.code || 'NOT_FOUND');
    } catch (error) {
      this.logger.error(`Error connecting to Profile Service for UUID: ${orgUuid}`, error);
      return BaseResponseDto.fail('Profile Service unavailable', 'SERVICE_UNAVAILABLE');
    }
  }

  async getOrganizationByAccountUuid(accountUuid: string): Promise<BaseResponseDto<OrganizationProfileResponseDto>> {
    this.logger.log(`Gateway → Fetching organization by account UUID: ${accountUuid}`);
    
    try {
      const res = await firstValueFrom(this.grpcService.GetOrganizationByAccountUuid({ accountUuid }));
      
      if (res && res.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }
      return BaseResponseDto.fail(res.message || 'Organization not found', res.code || 'NOT_FOUND');
    } catch (error) {
      this.logger.error(`Error connecting to Profile Service for account UUID: ${accountUuid}`, error);
      return BaseResponseDto.fail('Profile Service unavailable', 'SERVICE_UNAVAILABLE');
    }
  }

  async getOrganizationsByType(typeSlug: string): Promise<BaseResponseDto<OrganizationProfileResponseDto[]>> {
    this.logger.log(`Gateway → Filtering organizations by type: ${typeSlug}`);
    
    try {
      const res = await firstValueFrom(this.grpcService.GetOrganizationsByType({ typeSlug }));
      
      if (res && res.success) {
        return BaseResponseDto.ok(res.data || [], res.message, res.code);
      }
      return BaseResponseDto.fail(res.message, res.code);
    } catch (error) {
      this.logger.error(`Error filtering organizations by type: ${typeSlug}`, error);
      return BaseResponseDto.fail('Communication failure with Profile Service', 'SERVICE_UNAVAILABLE');
    }
  }

  // ======================================================
  // ORGANIZATION PROFILE UPDATES
  // ======================================================

  async updateOrganizationProfile(
    accountUuid: string,
    data: UpdateOrgProfileRequestDto
  ): Promise<BaseResponseDto<OrganizationProfileResponseDto>> {
    this.logger.log(`Gateway → Updating organization profile for account: ${accountUuid}`);

    try {
      const res = await firstValueFrom(
        this.grpcService.UpdateOrganizationProfile({ ...data, accountUuid })
      );

      if (res && res.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res.message || 'Update failed', res.code || 'INTERNAL');
    } catch (error) {
      this.logger.error(`gRPC Error updating organization profile: ${error.message}`);
      return BaseResponseDto.fail('Profile Service communication error', 'SERVICE_UNAVAILABLE');
    }
  }

  async updateEmployerProfile(
    accountUuid: string,
    data: UpdateEmployerProfileRequestDto
  ): Promise<BaseResponseDto<EmployerProfileResponseDto>> {
    this.logger.log(`Gateway → Updating employer profile for account: ${accountUuid}`);

    try {
      const res = await firstValueFrom(
        this.grpcService.UpdateEmployerProfile({ ...data, accountUuid })
      );

      if (res && res.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res.message || 'Update failed', res.code || 'INTERNAL');
    } catch (error) {
      this.logger.error(`gRPC Error updating employer profile: ${error.message}`);
      return BaseResponseDto.fail('Profile Service communication error', 'SERVICE_UNAVAILABLE');
    }
  }

  async updateSocialServiceProviderProfile(
    accountUuid: string,
    data: UpdateSocialServiceProviderProfileRequestDto
  ): Promise<BaseResponseDto<SocialServiceProviderProfileResponseDto>> {
    this.logger.log(`Gateway → Updating social service provider profile for account: ${accountUuid}`);

    try {
      const res = await firstValueFrom(
        this.grpcService.UpdateSocialServiceProviderProfile({ ...data, accountUuid })
      );

      if (res && res.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res.message || 'Update failed', res.code || 'INTERNAL');
    } catch (error) {
      this.logger.error(`gRPC Error updating social service provider profile: ${error.message}`);
      return BaseResponseDto.fail('Profile Service communication error', 'SERVICE_UNAVAILABLE');
    }
  }

  async updateOrganizationPropertyOwnerProfile(
    accountUuid: string,
    data: UpdateOrganizationPropertyOwnerProfileRequestDto
  ): Promise<BaseResponseDto<PropertyOwnerProfileResponseDto>> {
    this.logger.log(`Gateway → Updating property owner profile for account: ${accountUuid}`);

    try {
      const res = await firstValueFrom(
        this.grpcService.UpdateOrganizationPropertyOwnerProfile({ ...data, accountUuid })
      );

      if (res && res.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res.message || 'Update failed', res.code || 'INTERNAL');
    } catch (error) {
      this.logger.error(`gRPC Error updating property owner profile: ${error.message}`);
      return BaseResponseDto.fail('Profile Service communication error', 'SERVICE_UNAVAILABLE');
    }
  }

  async updateOrganizationSkilledProfessionalProfile(
    accountUuid: string,
    data: UpdateOrganizationSkilledProfessionalProfileRequestDto
  ): Promise<BaseResponseDto<SkilledProfessionalProfileResponseDto>> {
    this.logger.log(`Gateway → Updating skilled professional profile for account: ${accountUuid}`);

    try {
      const res = await firstValueFrom(
        this.grpcService.UpdateOrganizationSkilledProfessionalProfile({ ...data, accountUuid })
      );

      if (res && res.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res.message || 'Update failed', res.code || 'INTERNAL');
    } catch (error) {
      this.logger.error(`gRPC Error updating skilled professional profile: ${error.message}`);
      return BaseResponseDto.fail('Profile Service communication error', 'SERVICE_UNAVAILABLE');
    }
  }

  async updateOrganizationIntermediaryAgentProfile(
    accountUuid: string,
    data: UpdateOrganizationIntermediaryAgentProfileRequestDto
  ): Promise<BaseResponseDto<IntermediaryAgentProfileResponseDto>> {
    this.logger.log(`Gateway → Updating intermediary agent profile for account: ${accountUuid}`);

    try {
      const res = await firstValueFrom(
        this.grpcService.UpdateOrganizationIntermediaryAgentProfile({ ...data, accountUuid })
      );

      if (res && res.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res.message || 'Update failed', res.code || 'INTERNAL');
    } catch (error) {
      this.logger.error(`gRPC Error updating intermediary agent profile: ${error.message}`);
      return BaseResponseDto.fail('Profile Service communication error', 'SERVICE_UNAVAILABLE');
    }
  }

  // ======================================================
  // REMOVE PROFILE
  // ======================================================

  async removeProfile(
    accountUuid: string,
    profileType: ProfileType
  ): Promise<BaseResponseDto<null>> {
    this.logger.log(`Gateway → Removing profile ${profileType} from account: ${accountUuid}`);

    try {
      const res = await firstValueFrom(
        this.grpcService.RemoveProfile({ accountUuid, profileType })
      );

      if (res && res.success) {
        return BaseResponseDto.ok(null, res.message, res.code);
      }

      return BaseResponseDto.fail(res.message || 'Failed to remove profile', res.code || 'INTERNAL_ERROR');
    } catch (error) {
      this.logger.error(`gRPC Error removing profile: ${error.message}`);
      return BaseResponseDto.fail('Profile Service communication error', 'SERVICE_UNAVAILABLE');
    }
  }

  // ======================================================
  // MEMBERSHIP
  // ======================================================

  async addMember(dto: AddOrgMemberRequestDto): Promise<BaseResponseDto<null>> {
    this.logger.log(`Gateway → Adding member ${dto.userUuid} to org ${dto.orgUuid}`);
    
    try {
      const res = await firstValueFrom(this.grpcService.AddOrganizationMember(dto));
      
      if (res && res.success) {
        return BaseResponseDto.ok(null, res.message, res.code);
      }
      return BaseResponseDto.fail(res.message, res.code);
    } catch (error) {
      this.logger.error(`Failed to add member to organization ${dto.orgUuid}`, error);
      return BaseResponseDto.fail('Request could not be processed', 'INTERNAL_SERVER_ERROR');
    }
  }

  // ======================================================
  // PROVIDER ONBOARDING
  // ======================================================

  async onboardOrganizationProvider(
    dto: OnboardOrgProviderGrpcRequestDto
  ): Promise<BaseResponseDto<ContractorProfileResponseDto>> {
    this.logger.log(`Gateway → Onboarding Org: ${dto.orgUuid} as Service Provider`);

    try {
      const res = await firstValueFrom(
        this.grpcService.OnboardOrganizationProvider(dto)
      );

      if (res && res.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(
        res.message || 'Organization onboarding failed', 
        res.code || 'INTERNAL_ERROR'
      );
    } catch (error) {
      this.logger.error(`gRPC Error during org onboarding for ${dto.orgUuid}`, error);
      return BaseResponseDto.fail('Profile Service communication error', 'SERVICE_UNAVAILABLE');
    }
  }

  // ======================================================
  // INVITATION MANAGEMENT
  // ======================================================

  async inviteMember(
    dto: InviteMemberRequestDto,
    organizationUuid: string,
    invitedByUserUuid: string
  ): Promise<BaseResponseDto<InviteMemberResponseDto>> {
    this.logger.log(`Gateway → Inviting ${dto.email} to org ${organizationUuid}`);

    try {
      const res = await firstValueFrom(
        this.grpcService.InviteMember({
          ...dto,
          organizationUuid,
          invitedByUserUuid
        })
      );

      if (res && res.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(
        res.message || 'Failed to send invitation',
        res.code || 'INTERNAL_ERROR'
      );
    } catch (error) {
      this.logger.error(`gRPC Error during invitation for ${dto.email}:`, error);
      return BaseResponseDto.fail('Profile Service communication error', 'SERVICE_UNAVAILABLE');
    }
  }

  async verifyInvitation(
    dto: VerifyInvitationRequestDto
  ): Promise<BaseResponseDto<InvitationVerificationResponseDto>> {
    this.logger.log(`Gateway → Verifying invitation token: ${dto.token}`);

    try {
      const res = await firstValueFrom(
        this.grpcService.VerifyInvitation(dto)
      );

      if (res && res.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(
        res.message || 'Failed to verify invitation',
        res.code || 'NOT_FOUND'
      );
    } catch (error) {
      this.logger.error(`gRPC Error during token verification: ${dto.token}`, error);
      return BaseResponseDto.fail('Profile Service communication error', 'SERVICE_UNAVAILABLE');
    }
  }

  async acceptInvitation(
    dto: AcceptInvitationRequestDto
  ): Promise<BaseResponseDto<AcceptInvitationResponseDto>> {
    this.logger.log(`Gateway → Accepting invitation with token: ${dto.token}`);

    try {
      const res = await firstValueFrom(
        this.grpcService.AcceptInvitation(dto)
      );

      if (res && res.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(
        res.message || 'Failed to accept invitation',
        res.code || 'INTERNAL_ERROR'
      );
    } catch (error) {
      this.logger.error(`gRPC Error during invitation acceptance for token: ${dto.token}`, error);
      return BaseResponseDto.fail('Profile Service communication error', 'SERVICE_UNAVAILABLE');
    }
  }

  async getOrganizationInvitations(
    organizationUuid: string,
    requestingUserUuid: string
  ): Promise<BaseResponseDto<InvitationDetailsResponseDto[]>> {
    this.logger.log(`Gateway → Fetching invitations for org ${organizationUuid}`);

    try {
      const res = await firstValueFrom(
        this.grpcService.GetOrganizationInvitations({
          organizationUuid,
          requestingUserUuid
        })
      );

      if (res && res.success) {
        return BaseResponseDto.ok(res.data || [], res.message, res.code);
      }

      return BaseResponseDto.fail(
        res.message || 'Failed to fetch invitations',
        res.code || 'INTERNAL_ERROR'
      );
    } catch (error) {
      this.logger.error(`gRPC Error fetching invitations for org ${organizationUuid}`, error);
      return BaseResponseDto.fail('Profile Service communication error', 'SERVICE_UNAVAILABLE');
    }
  }

  async resendInvitation(
    dto: ResendInvitationRequestDto,
    organizationUuid: string,
    requestedByUserUuid: string
  ): Promise<BaseResponseDto<null>> {
    this.logger.log(`Gateway → Resending invitation: ${dto.invitationId}`);

    try {
      const res = await firstValueFrom(
        this.grpcService.ResendInvitation({
          ...dto,
          organizationUuid,
          requestedByUserUuid
        })
      );

      if (res && res.success) {
        return BaseResponseDto.ok(null, res.message, res.code);
      }

      return BaseResponseDto.fail(
        res.message || 'Failed to resend invitation',
        res.code || 'INTERNAL_ERROR'
      );
    } catch (error) {
      this.logger.error(`gRPC Error resending invitation ${dto.invitationId}`, error);
      return BaseResponseDto.fail('Profile Service communication error', 'SERVICE_UNAVAILABLE');
    }
  }

  async cancelInvitation(
    dto: CancelInvitationRequestDto,
    organizationUuid: string,
    requestedByUserUuid: string
  ): Promise<BaseResponseDto<null>> {
    this.logger.log(`Gateway → Cancelling invitation: ${dto.invitationId}`);

    try {
      const res = await firstValueFrom(
        this.grpcService.CancelInvitation({
          ...dto,
          organizationUuid,
          requestedByUserUuid
        })
      );

      if (res && res.success) {
        return BaseResponseDto.ok(null, res.message, res.code);
      }

      return BaseResponseDto.fail(
        res.message || 'Failed to cancel invitation',
        res.code || 'INTERNAL_ERROR'
      );
    } catch (error) {
      this.logger.error(`gRPC Error cancelling invitation ${dto.invitationId}`, error);
      return BaseResponseDto.fail('Profile Service communication error', 'SERVICE_UNAVAILABLE');
    }
  }

  async checkInvitationStatus(
    dto: CheckInvitationStatusRequestDto
  ): Promise<BaseResponseDto<CheckInvitationStatusResponseDto>> {
    this.logger.log(`Gateway → Checking invitation status for ${dto.email} in org ${dto.organizationUuid}`);

    try {
      const res = await firstValueFrom(
        this.grpcService.CheckInvitationStatus(dto)
      );

      if (res && res.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(
        res.message || 'Failed to check invitation status',
        res.code || 'INTERNAL_ERROR'
      );
    } catch (error) {
      this.logger.error(`gRPC Error checking invitation status for ${dto.email}`, error);
      return BaseResponseDto.fail('Profile Service communication error', 'SERVICE_UNAVAILABLE');
    }
  }
}