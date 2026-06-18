
import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { IndividualOnboardingService } from '../services/individual-onboarding.service';
import {
  UserSignupRequestDto,
  BaseResponseDto,
  SignupResponseDto,
  AuthClientInfoDto,
} from '@pivota-api/dtos';

@Controller('individual-onboarding')
export class IndividualOnboardingController {
  private readonly logger = new Logger(IndividualOnboardingController.name);

  constructor(
    private readonly individualOnboardingService: IndividualOnboardingService,
  ) {}

  /* ======================================================
     INDIVIDUAL SIGNUP
  ====================================================== */
  @GrpcMethod('Onboarding', 'Signup')
  async handleSignupGrpc(
    data: UserSignupRequestDto & { 
      clientInfo?: AuthClientInfoDto
    }
  ): Promise<BaseResponseDto<SignupResponseDto>> {
    this.logger.log(`gRPC: Individual Signup for ${data.email} from ${data.clientInfo?.device || 'Unknown'}`);
    return await this.individualOnboardingService.signup(data, data.clientInfo);
  }
}