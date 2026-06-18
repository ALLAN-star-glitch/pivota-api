
import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { OrganizationOnboardingService } from '../services/organization-onboarding.service';
import {
  OrganisationSignupRequestDto,
  BaseResponseDto,
  OrganizationSignupDataDto,
  AuthClientInfoDto,
} from '@pivota-api/dtos';

@Controller('organization-onboarding')
export class OrganizationOnboardingController {
  private readonly logger = new Logger(OrganizationOnboardingController.name);

  constructor(
    private readonly organizationOnboardingService: OrganizationOnboardingService,
  ) {}

  /* ======================================================
     ORGANIZATION SIGNUP
  ====================================================== */
  @GrpcMethod('Onboarding', 'OrganisationSignup')
  async handleOrganisationSignupGrpc(
    data: OrganisationSignupRequestDto & { 
      clientInfo?: AuthClientInfoDto
    }
  ): Promise<BaseResponseDto<OrganizationSignupDataDto>> {
    this.logger.log(`gRPC: Organisation Signup for ${data.name} from ${data.clientInfo?.device || 'Unknown'}`);
    return await this.organizationOnboardingService.signup(data, data.clientInfo);
  }
}