import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { 
  BaseResponseDto, 
  OrganizationProfileResponseDto,
  AddOrgMemberRequestDto
} from '@pivota-api/dtos';
import { firstValueFrom, Observable } from 'rxjs';

// ---------------- gRPC Interface ----------------
interface OrganisationServiceGrpc {
  GetOrganisationByUuid(
    data: { orgUuid: string },
  ): Observable<BaseResponseDto<OrganizationProfileResponseDto>>;

  GetOrganisationsByType(
    data: { typeSlug: string },
  ): Observable<BaseResponseDto<OrganizationProfileResponseDto[]>>;

  AddOrganisationMember(
    data: AddOrgMemberRequestDto,
  ): Observable<BaseResponseDto<null>>;
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
     ADD ORGANIZATION MEMBER
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
}