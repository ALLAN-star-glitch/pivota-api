import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod, Payload } from '@nestjs/microservices';
import { OrganisationService } from '../services/organisation.service';
import { 
  BaseResponseDto,
  CreateOrganisationRequestDto,
  OrganizationProfileResponseDto, 
  // Invitation DTOs
  InviteMemberGrpcRequestDto,
  InviteMemberResponseDto,
  VerifyInvitationRequestDto,
  InvitationVerificationResponseDto,
  AcceptInvitationGrpcRequestDto,
  AcceptInvitationResponseDto,
  GetOrganizationInvitationsRequestDto,
  InvitationDetailsResponseDto,
  ResendInvitationGrpcRequestDto,
  CancelInvitationGrpcRequestDto,
  CheckInvitationStatusRequestDto,
  CheckInvitationStatusResponseDto,
  // Update DTOs
  UpdateOrgProfileRequestDto,
  // Profile update DTOs
  UpdateEmployerGrpcRequestDto,
  UpdateSocialServiceProviderGrpcRequestDto,
  UpdateOrganizationPropertyOwnerGrpcRequestDto,
  UpdateOrganizationSkilledProfessionalGrpcRequestDto,
  UpdateOrganizationIntermediaryAgentGrpcRequestDto,

  EmployerProfileDataDto,
  EmployerProfileResponseDto,
  IntermediaryAgentProfileDataDto,
  IntermediaryAgentProfileResponseDto,
  SocialServiceProviderProfileDataDto,
  SocialServiceProviderProfileResponseDto,
  PropertyOwnerProfileResponseDto,
  PropertyOwnerProfileDataDto,
  SkilledProfessionalProfileResponseDto,
  SkilledProfessionalProfileDataDto,
} from '@pivota-api/dtos';
import { ProfileType } from '@pivota-api/constants';

@Controller()
export class OrganisationController {
  private readonly logger = new Logger(OrganisationController.name);

  constructor(
    private readonly organisationService: OrganisationService,
  ) {}

  /* ======================================================
     CREATE ORGANIZATION ACCOUNT WITH PROFILES
  ====================================================== */
  @GrpcMethod('ProfileService', 'CreateOrganizationAccountWithProfiles')
  async createOrganizationAccountWithProfiles(
    @Payload() data: CreateOrganisationRequestDto,
  ): Promise<BaseResponseDto<OrganizationProfileResponseDto>> {
    this.logger.log(
      `gRPC → CreateOrganizationAccountWithProfiles: ${data.organizationName}`,
    );
    return this.organisationService.createOrganizationAccountWithProfiles(data);
  }

  /* ======================================================
     GET ORGANIZATION BY UUID
  ====================================================== */
  @GrpcMethod('ProfileService', 'GetOrganizationByUuid')
  async getOrganizationByUuid(
    @Payload() data: { orgUuid: string },
  ): Promise<BaseResponseDto<OrganizationProfileResponseDto>> {
    this.logger.log(`gRPC → GetOrganizationByUuid: ${data.orgUuid}`);
    return this.organisationService.getOrganizationByUuid(data.orgUuid);
  }

  /* ======================================================
     GET ORGANIZATION BY ACCOUNT UUID
  ====================================================== */
  @GrpcMethod('ProfileService', 'GetOrganizationByAccountUuid')
  async getOrganizationByAccountUuid(
    @Payload() data: { accountUuid: string },
  ): Promise<BaseResponseDto<OrganizationProfileResponseDto>> {
    this.logger.log(`gRPC → GetOrganizationByAccountUuid: ${data.accountUuid}`);
    return this.organisationService.getOrganizationByAccountUuid(data.accountUuid);
  }

  /* ======================================================
     GET ORGANIZATIONS BY TYPE
  ====================================================== */
  @GrpcMethod('ProfileService', 'GetOrganizationsByType')
  async getOrganizationsByType(
    @Payload() data: { typeSlug: string },
  ): Promise<BaseResponseDto<OrganizationProfileResponseDto[]>> {
    this.logger.log(`gRPC → GetOrganizationsByType: ${data.typeSlug}`);
    return this.organisationService.getOrganizationsByType(data.typeSlug);
  }

  /* ======================================================
     UPDATE ORGANIZATION PROFILE
  ====================================================== */
  @GrpcMethod('ProfileService', 'UpdateOrganizationProfile')
  async updateOrganizationProfile(
    @Payload() data: { accountUuid: string; data: UpdateOrgProfileRequestDto },
  ): Promise<BaseResponseDto<OrganizationProfileResponseDto>> {
    this.logger.log(`gRPC → UpdateOrganizationProfile for account: ${data.accountUuid}`);
    return this.organisationService.updateOrganizationProfile(data.accountUuid, data.data);
  }

  /* ======================================================
     EMPLOYER PROFILE METHODS
  ====================================================== */
  @GrpcMethod('ProfileService', 'CreateEmployerProfile')
  async createEmployerProfile(
    @Payload() data: { accountUuid: string; data: EmployerProfileDataDto },
  ): Promise<BaseResponseDto<EmployerProfileResponseDto>> {
    this.logger.log(`gRPC → CreateEmployerProfile for account: ${data.accountUuid}`);
    return this.organisationService.createEmployerProfile(data.accountUuid, data.data);
  }

  @GrpcMethod('ProfileService', 'UpdateEmployerProfile')
  async updateEmployerProfile(
    @Payload() data: UpdateEmployerGrpcRequestDto,
  ): Promise<BaseResponseDto<EmployerProfileResponseDto>> {
    this.logger.log(`gRPC → UpdateEmployerProfile for account: ${data.accountUuid}`);
    return this.organisationService.updateEmployerProfile(data.accountUuid, data);
  }

  /* ======================================================
     SOCIAL SERVICE PROVIDER PROFILE METHODS
  ====================================================== */
  @GrpcMethod('ProfileService', 'CreateSocialServiceProviderProfile')
  async createSocialServiceProviderProfile(
    @Payload() data: { accountUuid: string; data: SocialServiceProviderProfileDataDto },
  ): Promise<BaseResponseDto<SocialServiceProviderProfileResponseDto>> {
    this.logger.log(`gRPC → CreateSocialServiceProviderProfile for account: ${data.accountUuid}`);
    return this.organisationService.createSocialServiceProviderProfile(data.accountUuid, data.data);
  }

  @GrpcMethod('ProfileService', 'UpdateSocialServiceProviderProfile')
  async updateSocialServiceProviderProfile(
    @Payload() data: UpdateSocialServiceProviderGrpcRequestDto,
  ): Promise<BaseResponseDto<SocialServiceProviderProfileResponseDto>> {
    this.logger.log(`gRPC → UpdateSocialServiceProviderProfile for account: ${data.accountUuid}`);
    return this.organisationService.updateSocialServiceProviderProfile(data.accountUuid, data);
  }

  /* ======================================================
     PROPERTY OWNER PROFILE METHODS
  ====================================================== */
  @GrpcMethod('ProfileService', 'CreateOrganizationPropertyOwnerProfile')
  async createOrganizationPropertyOwnerProfile(
    @Payload() data: { accountUuid: string; data: PropertyOwnerProfileDataDto },
  ): Promise<BaseResponseDto<PropertyOwnerProfileResponseDto>> {
    this.logger.log(`gRPC → CreateOrganizationPropertyOwnerProfile for account: ${data.accountUuid}`);
    return this.organisationService.createOrganizationPropertyOwnerProfile(data.accountUuid, data.data);
  }

  @GrpcMethod('ProfileService', 'UpdateOrganizationPropertyOwnerProfile')
  async updateOrganizationPropertyOwnerProfile(
    @Payload() data: UpdateOrganizationPropertyOwnerGrpcRequestDto,
  ): Promise<BaseResponseDto<PropertyOwnerProfileResponseDto>> {
    this.logger.log(`gRPC → UpdateOrganizationPropertyOwnerProfile for account: ${data.accountUuid}`);
    return this.organisationService.updateOrganizationPropertyOwnerProfile(data.accountUuid, data);
  }

  /* ======================================================
     SKILLED PROFESSIONAL PROFILE METHODS
  ====================================================== */
  @GrpcMethod('ProfileService', 'CreateOrganizationSkilledProfessionalProfile')
  async createOrganizationSkilledProfessionalProfile(
    @Payload() data: { accountUuid: string; data: SkilledProfessionalProfileDataDto },
  ): Promise<BaseResponseDto<SkilledProfessionalProfileResponseDto>> {
    this.logger.log(`gRPC → CreateOrganizationSkilledProfessionalProfile for account: ${data.accountUuid}`);
    return this.organisationService.createOrganizationSkilledProfessionalProfile(data.accountUuid, data.data);
  }

  @GrpcMethod('ProfileService', 'UpdateOrganizationSkilledProfessionalProfile')
  async updateOrganizationSkilledProfessionalProfile(
    @Payload() data: UpdateOrganizationSkilledProfessionalGrpcRequestDto,
  ): Promise<BaseResponseDto<SkilledProfessionalProfileResponseDto>> {
    this.logger.log(`gRPC → UpdateOrganizationSkilledProfessionalProfile for account: ${data.accountUuid}`);
    return this.organisationService.updateOrganizationSkilledProfessionalProfile(data.accountUuid, data);
  }

  /* ======================================================
     INTERMEDIARY AGENT PROFILE METHODS
  ====================================================== */
  @GrpcMethod('ProfileService', 'CreateOrganizationIntermediaryAgentProfile')
  async createOrganizationIntermediaryAgentProfile(
    @Payload() data: { accountUuid: string; data: IntermediaryAgentProfileDataDto },
  ): Promise<BaseResponseDto<IntermediaryAgentProfileResponseDto>> {
    this.logger.log(`gRPC → CreateOrganizationIntermediaryAgentProfile for account: ${data.accountUuid}`);
    return this.organisationService.createOrganizationIntermediaryAgentProfile(data.accountUuid, data.data);
  }

  @GrpcMethod('ProfileService', 'UpdateOrganizationIntermediaryAgentProfile')
  async updateOrganizationIntermediaryAgentProfile(
    @Payload() data: UpdateOrganizationIntermediaryAgentGrpcRequestDto,
  ): Promise<BaseResponseDto<IntermediaryAgentProfileResponseDto>> {
    this.logger.log(`gRPC → UpdateOrganizationIntermediaryAgentProfile for account: ${data.accountUuid}`);
    return this.organisationService.updateOrganizationIntermediaryAgentProfile(data.accountUuid, data);
  }

  /* ======================================================
     REMOVE PROFILE
  ====================================================== */
  @GrpcMethod('ProfileService', 'RemoveOrganizationProfile')
  async removeProfile(
    @Payload() data: { accountUuid: string; profileType: ProfileType },
  ): Promise<BaseResponseDto<null>> {
    this.logger.log(`gRPC → RemoveProfile: ${data.profileType} from account ${data.accountUuid}`);
    return this.organisationService.removeProfile(data.accountUuid, data.profileType);
  }

  /* ======================================================
     TEAM MANAGEMENT METHODS
  ====================================================== */
  @GrpcMethod('ProfileService', 'InviteMember')
  async inviteMember(
    @Payload() data: InviteMemberGrpcRequestDto,
  ): Promise<BaseResponseDto<InviteMemberResponseDto>> {
    this.logger.log(`gRPC → InviteMember: ${data.email} to org ${data.organizationUuid}`);
    return this.organisationService.inviteMember(data);
  }

  @GrpcMethod('ProfileService', 'VerifyInvitation')
  async verifyInvitation(
    @Payload() data: VerifyInvitationRequestDto,
  ): Promise<BaseResponseDto<InvitationVerificationResponseDto>> {
    this.logger.log(`gRPC → VerifyInvitation for token: ${data.token}`);
    return this.organisationService.verifyInvitation(data);
  }

  @GrpcMethod('ProfileService', 'AcceptInvitation')
  async acceptInvitation(
    @Payload() data: AcceptInvitationGrpcRequestDto,
  ): Promise<BaseResponseDto<AcceptInvitationResponseDto>> {
    this.logger.log(`gRPC → AcceptInvitation for token: ${data.token}`);
    return this.organisationService.acceptInvitation(data);
  }

  @GrpcMethod('ProfileService', 'GetOrganizationInvitations')
  async getOrganizationInvitations(
    @Payload() data: GetOrganizationInvitationsRequestDto,
  ): Promise<BaseResponseDto<InvitationDetailsResponseDto[]>> {
    this.logger.log(`gRPC → GetOrganizationInvitations for org: ${data.organizationUuid}`);
    return this.organisationService.getOrganizationInvitations(data);
  }

  @GrpcMethod('ProfileService', 'ResendInvitation')
  async resendInvitation(
    @Payload() data: ResendInvitationGrpcRequestDto,
  ): Promise<BaseResponseDto<null>> {
    this.logger.log(`gRPC → ResendInvitation: ${data.invitationId}`);
    return this.organisationService.resendInvitation(data);
  }

  @GrpcMethod('ProfileService', 'CancelInvitation')
  async cancelInvitation(
    @Payload() data: CancelInvitationGrpcRequestDto,
  ): Promise<BaseResponseDto<null>> {
    this.logger.log(`gRPC → CancelInvitation: ${data.invitationId}`);
    return this.organisationService.cancelInvitation(data);
  }

  @GrpcMethod('ProfileService', 'CheckInvitationStatus')
  async checkInvitationStatus(
    @Payload() data: CheckInvitationStatusRequestDto,
  ): Promise<BaseResponseDto<CheckInvitationStatusResponseDto>> {
    this.logger.log(`gRPC → CheckInvitationStatus for ${data.email} in org ${data.organizationUuid}`);
    return this.organisationService.checkInvitationStatus(data);
  }
}