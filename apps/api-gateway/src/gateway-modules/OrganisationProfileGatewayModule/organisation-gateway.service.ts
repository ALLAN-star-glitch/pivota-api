import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
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
} from '@pivota-api/dtos';
import { firstValueFrom, Observable } from 'rxjs';

// ---------------- gRPC Interface ----------------
interface OrganisationServiceGrpc {
  // Existing methods
  GetOrganisationByUuid(
    data: { orgUuid: string },
  ): Observable<BaseResponseDto<OrganizationProfileResponseDto>>;

  GetOrganisationsByType(
    data: { typeSlug: string },
  ): Observable<BaseResponseDto<OrganizationProfileResponseDto[]>>;

  AddOrganisationMember(
    data: AddOrgMemberRequestDto,
  ): Observable<BaseResponseDto<null>>;

  OnboardOrganizationProvider(
    data: OnboardOrgProviderGrpcRequestDto
  ): Observable<BaseResponseDto<ContractorProfileResponseDto>>;

  // New Invitation Methods
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

  /* ======================================================
     ONBOARD ORGANIZATION AS SERVICE PROVIDER
  ====================================================== */
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

  /* ======================================================
     GET ORGANIZATION BY UUID
  ====================================================== */
  async getOrganisationByUuid(orgUuid: string): Promise<BaseResponseDto<OrganizationProfileResponseDto>> {
    this.logger.log(`Gateway → Fetching organization: ${orgUuid}`);
    
    try {
      const res = await firstValueFrom(this.grpcService.GetOrganisationByUuid({ orgUuid }));
      
      if (res && res.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }
      return BaseResponseDto.fail(res.message || 'Organization not found', res.code || 'NOT_FOUND');
    } catch (error) {
      this.logger.error(`Error connecting to Profile Service for UUID: ${orgUuid}`, error);
      return BaseResponseDto.fail('Profile Service unavailable', 'SERVICE_UNAVAILABLE');
    }
  }

  /* ======================================================
     GET ORGANIZATIONS BY TYPE
  ====================================================== */
  async getOrganisationsByType(typeSlug: string): Promise<BaseResponseDto<OrganizationProfileResponseDto[]>> {
    this.logger.log(`Gateway → Filtering organizations by type: ${typeSlug}`);
    
    try {
      const res = await firstValueFrom(this.grpcService.GetOrganisationsByType({ typeSlug }));
      
      if (res && res.success) {
        return BaseResponseDto.ok(res.data || [], res.message, res.code);
      }
      return BaseResponseDto.fail(res.message, res.code);
    } catch (error) {
      this.logger.error(`Error filtering organizations by type: ${typeSlug}`, error);
      return BaseResponseDto.fail('Communication failure with Profile Service', 'SERVICE_UNAVAILABLE');
    }
  }

  /* ======================================================
     ADD ORGANIZATION MEMBER (Direct Add)
  ====================================================== */
  async addMember(dto: AddOrgMemberRequestDto): Promise<BaseResponseDto<null>> {
    this.logger.log(`Gateway → Adding member ${dto.userUuid} to org ${dto.orgUuid}`);
    
    try {
      const res = await firstValueFrom(this.grpcService.AddOrganisationMember(dto));
      
      if (res && res.success) {
        return BaseResponseDto.ok(null, res.message, res.code);
      }
      return BaseResponseDto.fail(res.message, res.code);
    } catch (error) {
      this.logger.error(`Failed to add member to organization ${dto.orgUuid}`, error);
      return BaseResponseDto.fail('Request could not be processed', 'INTERNAL_SERVER_ERROR');
    }
  } 
  

  /* ======================================================
     INVITE MEMBER - Send email invitation
     - Extracts organizationUuid and invitedByUserUuid from JWT context
  ====================================================== */
  // In gateway/src/modules/organisation-gateway/organisation-gateway.service.ts

async inviteMember(
  dto: InviteMemberRequestDto,
  organizationUuid: string,
  invitedByUserUuid: string
): Promise<BaseResponseDto<InviteMemberResponseDto>> {
  this.logger.log(`Gateway → Inviting ${dto.email} to org ${organizationUuid}`);

  try {
    this.logger.debug(`Sending gRPC request with data: ${JSON.stringify({
      ...dto,
      organizationUuid,
      invitedByUserUuid
    })}`);
    
    const res = await firstValueFrom(
      this.grpcService.InviteMember({
        ...dto,
        organizationUuid,
        invitedByUserUuid
      })
    );

    // ✅ Log the raw response from gRPC
    this.logger.log(`Gateway ← Raw gRPC response: ${JSON.stringify(res)}`);

    if (res && res.success) {
      this.logger.log(`✅ Invitation successful: ${JSON.stringify(res.data)}`);
      return BaseResponseDto.ok(res.data, res.message, res.code);
    }

    this.logger.error(`❌ Invitation failed: ${res.message}`);
    return BaseResponseDto.fail(
      res.message || 'Failed to send invitation',
      res.code || 'INTERNAL_ERROR'
    );
  } catch (error) {
    this.logger.error(`🔥 gRPC Error during invitation for ${dto.email}:`, error);
    
    // Check for gRPC specific error
    if (error && typeof error === 'object' && 'code' in error) {
      const grpcError = error as { code: number; details: string; message: string };
      this.logger.error(`gRPC error code: ${grpcError.code}, details: ${grpcError.details}`);
      return BaseResponseDto.fail(
        grpcError.details || grpcError.message || 'gRPC service error',
        'INTERNAL_ERROR'
      );
    }
    
    return BaseResponseDto.fail('Profile Service communication error', 'SERVICE_UNAVAILABLE');
  }
}

  /* ======================================================
     VERIFY INVITATION - Check if token is valid
  ====================================================== */
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

  /* ======================================================
     ACCEPT INVITATION - Complete the invitation flow
  ====================================================== */
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

  /* ======================================================
     GET ORGANIZATION INVITATIONS - List pending invites
     - Extracts organizationUuid and requestingUserUuid from JWT context
  ====================================================== */
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

  /* ======================================================
     RESEND INVITATION - Generate new token
     - Extracts organizationUuid and requestedByUserUuid from JWT context
  ====================================================== */
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

  /* ======================================================
     CANCEL INVITATION - Remove pending invitation
     - Extracts organizationUuid and requestedByUserUuid from JWT context
  ====================================================== */
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

  /* ======================================================
     CHECK INVITATION STATUS - Quick check for UI
  ====================================================== */
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