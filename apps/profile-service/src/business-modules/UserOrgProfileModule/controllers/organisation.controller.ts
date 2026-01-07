import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { OrganisationService } from '../services/organisation.service';
import { 
  AddOrgMemberRequestDto,
  BaseResponseDto,
  CreateOrganisationRequestDto,
  OrganizationProfileResponseDto, 
  // Import your actual DTOs here
} from '@pivota-api/dtos';

@Controller()
export class OrganisationController {
  private readonly logger = new Logger(OrganisationController.name);

  constructor(
    private readonly organisationService: OrganisationService,
  ) {}

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

  /* ======================================================
     ADD ORGANIZATION MEMBER
  ====================================================== */
  @GrpcMethod('ProfileService', 'AddOrganisationMember')
  async addOrganisationMember(
    data: AddOrgMemberRequestDto,
  ): Promise<BaseResponseDto<null>> {
    return this.organisationService.addMember(data);
  }
}
