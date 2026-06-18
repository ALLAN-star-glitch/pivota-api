/* eslint-disable @typescript-eslint/no-explicit-any */
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import {
  UserSignupRequestDto,
  BaseResponseDto,
  SignupResponseDto,
  AuthClientInfoDto,
  OrganisationSignupRequestDto,
  OrganizationSignupDataDto,
} from '@pivota-api/dtos';

// Updated gRPC interface for OnboardingService
interface OnboardingServiceGrpc {
  signup(
    data: UserSignupRequestDto & { clientInfo?: AuthClientInfoDto }
  ): Observable<BaseResponseDto<SignupResponseDto>>;

  organisationSignup(
    data: OrganisationSignupRequestDto & { clientInfo?: AuthClientInfoDto }
  ): Observable<BaseResponseDto<OrganizationSignupDataDto>>;
}

@Injectable()
export class OnboardingGatewayService {
  private readonly logger = new Logger(OnboardingGatewayService.name);
  private onboardingGrpc: OnboardingServiceGrpc;

  constructor(
    @Inject('ONBOARDING_PACKAGE') private readonly grpcClient: ClientGrpc,
  ) {
    this.onboardingGrpc = this.grpcClient.getService<OnboardingServiceGrpc>('Onboarding');
  }

  /** ------------------ Individual Signup ------------------ */
  async signup(
    signupDto: UserSignupRequestDto,
    clientInfo: AuthClientInfoDto
  ): Promise<BaseResponseDto<SignupResponseDto>> {
    this.logger.log('📩 Calling Onboarding microservice for individual signup');

    // Log which specific data field is being used
    this.logger.debug(`[gRPC] Primary purpose: ${signupDto.primaryPurpose}`);

    if (signupDto.jobSeekerData) {
      this.logger.debug(`[gRPC] Using jobSeekerData`);
    } else if (signupDto.skilledProfessionalData) {
      this.logger.debug(`[gRPC] Using skilledProfessionalData`);
    } else if (signupDto.intermediaryAgentData) {
      this.logger.debug(`[gRPC] Using intermediaryAgentData`);
    } else if (signupDto.housingSeekerData) {
      this.logger.debug(`[gRPC] Using housingSeekerData`);
    } else if (signupDto.supportBeneficiaryData) {
      this.logger.debug(`[gRPC] Using supportBeneficiaryData`);
    } else if (signupDto.employerData) {
      this.logger.debug(`[gRPC] Using employerData`);
    } else if (signupDto.propertyOwnerData) {
      this.logger.debug(`[gRPC] Using propertyOwnerData`);
    }

    // Log the client info for debugging
    this.logger.debug(`[gRPC] Sending client info with signup: ${JSON.stringify({
      device: clientInfo.device,
      deviceType: clientInfo.deviceType,
      os: clientInfo.os,
      browser: clientInfo.browser,
      ipAddress: clientInfo.ipAddress
    })}`);

    // Build the request
    const request: any = {
      firstName: signupDto.firstName,
      lastName: signupDto.lastName,
      email: signupDto.email,
      password: signupDto.password,
      phone: signupDto.phone,
      planSlug: signupDto.planSlug || 'free-forever',
      code: signupDto.code,
      profileImage: signupDto.profileImage,
      primaryPurpose: signupDto.primaryPurpose,
      clientInfo: clientInfo
    };

    // Map the specific fields from the DTO to the gRPC request
    if (signupDto.jobSeekerData) {
      request.jobSeekerData = signupDto.jobSeekerData;
    } else if (signupDto.skilledProfessionalData) {
      request.skilledProfessionalData = signupDto.skilledProfessionalData;
    } else if (signupDto.intermediaryAgentData) {
      request.intermediaryAgentData = signupDto.intermediaryAgentData;
    } else if (signupDto.housingSeekerData) {
      request.housingSeekerData = signupDto.housingSeekerData;
    } else if (signupDto.supportBeneficiaryData) {
      request.supportBeneficiaryData = signupDto.supportBeneficiaryData;
    } else if (signupDto.employerData) {
      request.employerData = signupDto.employerData;
    } else if (signupDto.propertyOwnerData) {
      request.propertyOwnerData = signupDto.propertyOwnerData;
    } else if (signupDto.profileData) {
      // Fallback for backward compatibility
      this.logger.debug(`[gRPC] Falling back to deprecated profileData mapping for purpose: ${signupDto.primaryPurpose}`);

      switch (signupDto.primaryPurpose) {
        case 'FIND_JOB':
          request.jobSeekerData = signupDto.profileData;
          break;
        case 'OFFER_SKILLED_SERVICES':
          request.skilledProfessionalData = signupDto.profileData;
          break;
        case 'WORK_AS_AGENT':
          request.intermediaryAgentData = signupDto.profileData;
          break;
        case 'FIND_HOUSING':
          request.housingSeekerData = signupDto.profileData;
          break;
        case 'GET_SOCIAL_SUPPORT':
          request.supportBeneficiaryData = signupDto.profileData;
          break;
        case 'HIRE_EMPLOYEES':
          request.employerData = signupDto.profileData;
          break;
        case 'LIST_PROPERTIES':
          request.propertyOwnerData = signupDto.profileData;
          break;
        default:
          this.logger.warn(`Unknown primary purpose for fallback: ${signupDto.primaryPurpose}`);
      }
    }

    // Log what we're sending
    this.logger.debug(`[gRPC] Final request fields: ${Object.keys(request).join(', ')}`);
    this.logger.debug(`[gRPC] Has jobSeekerData: ${!!request.jobSeekerData}`);
    this.logger.debug(`[gRPC] Has skilledProfessionalData: ${!!request.skilledProfessionalData}`);
    this.logger.debug(`[gRPC] Has intermediaryAgentData: ${!!request.intermediaryAgentData}`);
    this.logger.debug(`[gRPC] Has housingSeekerData: ${!!request.housingSeekerData}`);
    this.logger.debug(`[gRPC] Has supportBeneficiaryData: ${!!request.supportBeneficiaryData}`);
    this.logger.debug(`[gRPC] Has employerData: ${!!request.employerData}`);
    this.logger.debug(`[gRPC] Has propertyOwnerData: ${!!request.propertyOwnerData}`);

    const grpcSignupResponse = await firstValueFrom(this.onboardingGrpc.signup(request));
    this.logger.log(`📩 Received response from Onboarding microservice: ${JSON.stringify(grpcSignupResponse)}`);

    if (grpcSignupResponse.success) {
      return BaseResponseDto.ok(grpcSignupResponse.data, grpcSignupResponse.message, grpcSignupResponse.code);
    }

    return BaseResponseDto.fail(grpcSignupResponse.message, grpcSignupResponse.code);
  }

  /** ------------------ Organization Signup ------------------ */
  async signupOrganisation(
    dto: OrganisationSignupRequestDto,
    clientInfo: AuthClientInfoDto
  ): Promise<BaseResponseDto<OrganizationSignupDataDto>> {
    this.logger.log('📩 Calling Onboarding microservice for organization signup');

    // Log the client info for debugging
    this.logger.debug(`[gRPC] Organisation signup - Client info received: ${JSON.stringify({
      device: clientInfo?.device,
      deviceType: clientInfo?.deviceType,
      os: clientInfo?.os,
      osVersion: clientInfo?.osVersion,
      browser: clientInfo?.browser,
      browserVersion: clientInfo?.browserVersion,
      ipAddress: clientInfo?.ipAddress,
      isBot: clientInfo?.isBot
    })}`);

    const request = {
      ...dto,
      clientInfo: clientInfo
    };

    const grpcResponse = await firstValueFrom(
      this.onboardingGrpc.organisationSignup(request),
    );

    this.logger.debug(`📩 Received response from Onboarding microservice: ${JSON.stringify(grpcResponse)}`);

    if (grpcResponse.success) {
      return BaseResponseDto.ok(
        grpcResponse.data,
        grpcResponse.message,
        grpcResponse.code,
      );
    }

    return BaseResponseDto.fail(
      grpcResponse.message,
      grpcResponse.code,
    );
  }
}