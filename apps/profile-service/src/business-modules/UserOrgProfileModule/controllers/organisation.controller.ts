import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod, Payload } from '@nestjs/microservices';
import { OrganisationService } from '../services/organisation.service';
import { 
  BaseResponseDto,
  CreateOrganisationRequestDto,
  OrganizationProfileResponseDto, 
  // NEW DTOs
  OnboardOrgProviderGrpcRequestDto,
  ContractorProfileResponseDto,
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
} from '@pivota-api/dtos';

@Controller()
export class OrganisationController {
  private readonly logger = new Logger(OrganisationController.name);

  constructor(
    private readonly organisationService: OrganisationService,
  ) {}

  /* ======================================================
     ONBOARD ORGANIZATION AS SERVICE PROVIDER
  ====================================================== */
  @GrpcMethod('ProfileService', 'OnboardOrganizationProvider')
  async onboardOrganizationProvider(
    @Payload() data: OnboardOrgProviderGrpcRequestDto,
  ): Promise<BaseResponseDto<ContractorProfileResponseDto>> {
    this.logger.log(`gRPC → OnboardOrganizationProvider for: ${data.orgUuid}`);
    
    return this.organisationService.onboardOrganizationProvider(data);
  }

  /* ======================================================
     CREATE ORGANIZATION PROFILE (Auth → Profile)
  ====================================================== */
  @GrpcMethod('ProfileService', 'CreateOrganizationProfile')
  async createOrganizationProfile(
    data: CreateOrganisationRequestDto,
  ): Promise<BaseResponseDto<OrganizationProfileResponseDto>> {
    this.logger.log(
      `gRPC → CreateOrganizationProfile: ${data.name}`,
    );

    return this.organisationService.createOrganizationProfile(data);
  }

  /* ======================================================
     GET ORGANIZATION BY UUID
  ====================================================== */
  @GrpcMethod('ProfileService', 'GetOrganisationByUuid')
  async getOrganisationByUuid(
    data: { orgUuid: string },
  ): Promise<BaseResponseDto<OrganizationProfileResponseDto>> {
    return this.organisationService.getOrganisationByUuid(
      data.orgUuid,
    );
  }

  // /* ======================================================
  //    ADD ORGANIZATION MEMBER
  // ====================================================== */
  // @GrpcMethod('ProfileService', 'AddOrganisationMember')
  // async addOrganisationMember(
  //   data: AddOrgMemberRequestDto,
  // ): Promise<BaseResponseDto<null>> {
  //   return this.organisationService.addMember(data);
  // }

  /* ======================================================
     GET ORGANIZATIONS BY TYPE
     - Filters organizations based on the OrganizationType slug
  ====================================================== */
  @GrpcMethod('ProfileService', 'GetOrganisationsByType')
  async getOrganisationsByType(
    data: { typeSlug: string },
  ): Promise<BaseResponseDto<OrganizationProfileResponseDto[]>> {
    this.logger.log(`gRPC → GetOrganisationsByType: ${data.typeSlug}`);
    return this.organisationService.getOrganisationsByType(data.typeSlug);
  }

  /* ======================================================
     INVITE MEMBER - Send email invitation
  ====================================================== */
  @GrpcMethod('ProfileService', 'InviteMember')
  async inviteMember(
    @Payload() data: InviteMemberGrpcRequestDto,
  ): Promise<BaseResponseDto<InviteMemberResponseDto>> {
    this.logger.log(`gRPC → InviteMember: ${data.email} to org ${data.organizationUuid}`);
    const resp = await this.organisationService.inviteMember(data);
    this.logger.log(`Response from inviteMember: ${JSON.stringify(resp)}`);
    return resp;
  }

  /* ======================================================
     VERIFY INVITATION - Check if token is valid
  ====================================================== */
  @GrpcMethod('ProfileService', 'VerifyInvitation')
  async verifyInvitation(
    @Payload() data: VerifyInvitationRequestDto,
  ): Promise<BaseResponseDto<InvitationVerificationResponseDto>> {
    this.logger.log(`gRPC → VerifyInvitation for token: ${data.token}`);
    return this.organisationService.verifyInvitation(data);
  }

  /* ======================================================
     ACCEPT INVITATION - Complete the invitation flow
  ====================================================== */
  @GrpcMethod('ProfileService', 'AcceptInvitation')
  async acceptInvitation(
    @Payload() data: AcceptInvitationGrpcRequestDto,
  ): Promise<BaseResponseDto<AcceptInvitationResponseDto>> {
    this.logger.log(`gRPC → AcceptInvitation for token: ${data.token}`);
    return this.organisationService.acceptInvitation(data);
  }

  /* ======================================================
     GET ORGANIZATION INVITATIONS - List pending invites
  ====================================================== */
  @GrpcMethod('ProfileService', 'GetOrganizationInvitations')
  async getOrganizationInvitations(
    @Payload() data: GetOrganizationInvitationsRequestDto,
  ): Promise<BaseResponseDto<InvitationDetailsResponseDto[]>> {
    this.logger.log(`gRPC → GetOrganizationInvitations for org: ${data.organizationUuid}`);
    return this.organisationService.getOrganizationInvitations(data);
  }

  /* ======================================================
     RESEND INVITATION - Generate new token
  ====================================================== */
  @GrpcMethod('ProfileService', 'ResendInvitation')
  async resendInvitation(
    @Payload() data: ResendInvitationGrpcRequestDto,
  ): Promise<BaseResponseDto<null>> {
    this.logger.log(`gRPC → ResendInvitation: ${data.invitationId}`);
    return this.organisationService.resendInvitation(data);
  }

  /* ======================================================
     CANCEL INVITATION - Remove pending invitation
  ====================================================== */
  @GrpcMethod('ProfileService', 'CancelInvitation')
  async cancelInvitation(
    @Payload() data: CancelInvitationGrpcRequestDto,
  ): Promise<BaseResponseDto<null>> {
    this.logger.log(`gRPC → CancelInvitation: ${data.invitationId}`);
    return this.organisationService.cancelInvitation(data);
  }

  /* ======================================================
     CHECK INVITATION STATUS - For admin dashboard
  ====================================================== */
  @GrpcMethod('ProfileService', 'CheckInvitationStatus')
  async checkInvitationStatus(
    @Payload() data: CheckInvitationStatusRequestDto,
  ): Promise<BaseResponseDto<CheckInvitationStatusResponseDto>> {
    this.logger.log(`gRPC → CheckInvitationStatus for ${data.email} in org ${data.organizationUuid}`);
    return this.organisationService.checkInvitationStatus(data);
  }
}