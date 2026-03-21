import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod, Payload } from '@nestjs/microservices';
import { UserService } from '../services/user.service';
import {
  BaseResponseDto,
  CreateAccountWithProfilesRequestDto,
  GetUserByUserUuidDto,
  UpdateFullUserProfileDto,
  UserProfileResponseDto,
  AccountResponseDto,
  JobSeekerProfileResponseDto,
  SkilledProfessionalProfileResponseDto,
  HousingSeekerProfileResponseDto,
  PropertyOwnerProfileResponseDto,
  SupportBeneficiaryProfileResponseDto,
  IntermediaryAgentProfileResponseDto,
  JobSeekerProfileDataDto,
  SkilledProfessionalProfileDataDto,
  HousingSeekerProfileDataDto,
  PropertyOwnerProfileDataDto,
  SupportBeneficiaryProfileDataDto,
  IntermediaryAgentProfileDataDto,
} from '@pivota-api/dtos';
import { ProfileType } from '@pivota-api/constants';

@Controller()
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  // ======================================================
  // MAIN ONBOARDING
  // ======================================================

  /** 
   * Create Individual Account with Multiple Profiles
   * Used for new individual user signup with multiple profile types
   */
  @GrpcMethod('ProfileService', 'CreateIndividualAccountWithProfiles')
  async handleCreateIndividualAccountWithProfiles(
    @Payload() dto: CreateAccountWithProfilesRequestDto,
  ): Promise<BaseResponseDto<AccountResponseDto>> {
    this.logger.log(`[gRPC] Creating individual account for email: ${dto.email}`);
    return this.userService.createIndividualAccountWithProfiles(dto);
  }

  // ======================================================
  // INDIVIDUAL PROFILE CREATION
  // ======================================================

  /**
   * Create Job Seeker Profile
   */
  @GrpcMethod('ProfileService', 'CreateJobSeekerProfile')
  async handleCreateJobSeekerProfile(
    @Payload() data: { accountUuid: string; data: JobSeekerProfileDataDto },
  ): Promise<BaseResponseDto<JobSeekerProfileResponseDto>> {
    this.logger.log(`[gRPC] Creating job seeker profile for account: ${data.accountUuid}`);
    return this.userService.createJobSeekerProfile(data.accountUuid, data.data);
  }

  /**
   * Create Skilled Professional Profile
   */
  @GrpcMethod('ProfileService', 'CreateSkilledProfessionalProfile')
  async handleCreateSkilledProfessionalProfile(
    @Payload() data: { accountUuid: string; data: SkilledProfessionalProfileDataDto },
  ): Promise<BaseResponseDto<SkilledProfessionalProfileResponseDto>> {
    this.logger.log(`[gRPC] Creating skilled professional profile for account: ${data.accountUuid}`);
    return this.userService.createSkilledProfessionalProfile(data.accountUuid, data.data);
  }

  /**
   * Create Intermediary Agent Profile
   */
  @GrpcMethod('ProfileService', 'CreateIntermediaryAgentProfile')
  async handleCreateIntermediaryAgentProfile(
    @Payload() data: { accountUuid: string; data: IntermediaryAgentProfileDataDto },
  ): Promise<BaseResponseDto<IntermediaryAgentProfileResponseDto>> {
    this.logger.log(`[gRPC] Creating intermediary agent profile for account: ${data.accountUuid}`);
    return this.userService.createIntermediaryAgentProfile(data.accountUuid, data.data);
  }

  /**
   * Create Housing Seeker Profile
   */
  @GrpcMethod('ProfileService', 'CreateHousingSeekerProfile')
  async handleCreateHousingSeekerProfile(
    @Payload() data: { accountUuid: string; data: HousingSeekerProfileDataDto },
  ): Promise<BaseResponseDto<HousingSeekerProfileResponseDto>> {
    this.logger.log(`[gRPC] Creating housing seeker profile for account: ${data.accountUuid}`);
    return this.userService.createHousingSeekerProfile(data.accountUuid, data.data);
  }

  /**
   * Create Property Owner Profile
   */
  @GrpcMethod('ProfileService', 'CreatePropertyOwnerProfile')
  async handleCreatePropertyOwnerProfile(
    @Payload() data: { accountUuid: string; data: PropertyOwnerProfileDataDto },
  ): Promise<BaseResponseDto<PropertyOwnerProfileResponseDto>> {
    this.logger.log(`[gRPC] Creating property owner profile for account: ${data.accountUuid}`);
    return this.userService.createPropertyOwnerProfile(data.accountUuid, data.data);
  }

  /**
   * Create Support Beneficiary Profile
   */
  @GrpcMethod('ProfileService', 'CreateSupportBeneficiaryProfile')
  async handleCreateSupportBeneficiaryProfile(
    @Payload() data: { accountUuid: string; data: SupportBeneficiaryProfileDataDto },
  ): Promise<BaseResponseDto<SupportBeneficiaryProfileResponseDto>> {
    this.logger.log(`[gRPC] Creating support beneficiary profile for account: ${data.accountUuid}`);
    return this.userService.createSupportBeneficiaryProfile(data.accountUuid, data.data);
  }

  // ======================================================
  // FETCH METHODS
  // ======================================================

  /**
   * Get Account by UUID
   */
  @GrpcMethod('ProfileService', 'GetAccountByUuid')
  async handleGetAccountByUuid(
    @Payload() data: { accountUuid: string },
  ): Promise<BaseResponseDto<AccountResponseDto>> {
    this.logger.log(`[gRPC] Fetching account by UUID: ${data.accountUuid}`);
    return this.userService.getAccountByUuid(data.accountUuid);
  }

  /**
   * Get My Profile (Own Account)
   */
  @GrpcMethod('ProfileService', 'GetMyProfile')
  async handleGetMyProfile(
    @Payload() data: { userUuid: string },
  ): Promise<BaseResponseDto<UserProfileResponseDto>> {
    this.logger.log(`[gRPC] GetMyProfile requested for authenticated user: ${data.userUuid}`);
    return this.userService.getMyProfile(data.userUuid);
  }

  /**
   * Get User Profile by Email
   */
  @GrpcMethod('ProfileService', 'GetUserProfileByEmail')
  async handleGetUserProfileByEmail(
    @Payload() data: { email: string },
  ): Promise<BaseResponseDto<UserProfileResponseDto>> {
    this.logger.log(`Fetching user profile by email: ${data.email}`);
    return this.userService.getUserProfileByEmail(data);
  }

  /**
   * Get User Profile by UUID
   */
  @GrpcMethod('ProfileService', 'GetUserProfileByUuid')
  async handleGetUserProfileByUuid(
    @Payload() data: GetUserByUserUuidDto,
  ): Promise<BaseResponseDto<UserProfileResponseDto>> {
    this.logger.log(`Fetching user profile by UUID: ${data.userUuid}`);
    return this.userService.getUserProfileByUuid(data);
  }

  // ======================================================
  // UPDATE METHODS
  // ======================================================

  /**
   * Update User Profile (Self)
   */
  @GrpcMethod('ProfileService', 'UpdateUserProfile')
  async handleUpdateUserProfile(
    @Payload() dto: UpdateFullUserProfileDto,
  ): Promise<BaseResponseDto<UserProfileResponseDto>> {
    this.logger.log(`[gRPC] UpdateUserProfile request for: ${dto.userUuid}`);
    return this.userService.updateProfile(dto);
  }

  /**
   * Update Job Seeker Profile
   */
  @GrpcMethod('ProfileService', 'UpdateJobSeekerProfile')
  async handleUpdateJobSeekerProfile(
    @Payload() data: { accountUuid: string; data: JobSeekerProfileDataDto },
  ): Promise<BaseResponseDto<JobSeekerProfileResponseDto>> {
    this.logger.log(`[gRPC] UpdateJobSeekerProfile for account: ${data.accountUuid}`);
    return this.userService.updateJobSeekerProfile(data.accountUuid, data.data);
  }

  /**
   * Update Skilled Professional Profile
   */
  @GrpcMethod('ProfileService', 'UpdateSkilledProfessionalProfile')
  async handleUpdateSkilledProfessionalProfile(
    @Payload() data: { accountUuid: string; data: SkilledProfessionalProfileDataDto },
  ): Promise<BaseResponseDto<SkilledProfessionalProfileResponseDto>> {
    this.logger.log(`[gRPC] UpdateSkilledProfessionalProfile for account: ${data.accountUuid}`);
    return this.userService.updateSkilledProfessionalProfile(data.accountUuid, data.data);
  }

  /**
   * Update Intermediary Agent Profile
   */
  @GrpcMethod('ProfileService', 'UpdateIntermediaryAgentProfile')
  async handleUpdateIntermediaryAgentProfile(
    @Payload() data: { accountUuid: string; data: IntermediaryAgentProfileDataDto },
  ): Promise<BaseResponseDto<IntermediaryAgentProfileResponseDto>> {
    this.logger.log(`[gRPC] UpdateIntermediaryAgentProfile for account: ${data.accountUuid}`);
    return this.userService.updateIntermediaryAgentProfile(data.accountUuid, data.data);
  }

  /**
   * Update Housing Seeker Profile
   */
  @GrpcMethod('ProfileService', 'UpdateHousingSeekerProfile')
  async handleUpdateHousingSeekerProfile(
    @Payload() data: { accountUuid: string; data: HousingSeekerProfileDataDto },
  ): Promise<BaseResponseDto<HousingSeekerProfileResponseDto>> {
    this.logger.log(`[gRPC] UpdateHousingSeekerProfile for account: ${data.accountUuid}`);
    return this.userService.updateHousingSeekerProfile(data.accountUuid, data.data);
  }

  /**
   * Update Property Owner Profile
   */
  @GrpcMethod('ProfileService', 'UpdatePropertyOwnerProfile')
  async handleUpdatePropertyOwnerProfile(
    @Payload() data: { accountUuid: string; data: PropertyOwnerProfileDataDto },
  ): Promise<BaseResponseDto<PropertyOwnerProfileResponseDto>> {
    this.logger.log(`[gRPC] UpdatePropertyOwnerProfile for account: ${data.accountUuid}`);
    return this.userService.updatePropertyOwnerProfile(data.accountUuid, data.data);
  }

  /**
   * Update Support Beneficiary Profile
   */
  @GrpcMethod('ProfileService', 'UpdateSupportBeneficiaryProfile')
  async handleUpdateSupportBeneficiaryProfile(
    @Payload() data: { accountUuid: string; data: SupportBeneficiaryProfileDataDto },
  ): Promise<BaseResponseDto<SupportBeneficiaryProfileResponseDto>> {
    this.logger.log(`[gRPC] UpdateSupportBeneficiaryProfile for account: ${data.accountUuid}`);
    return this.userService.updateSupportBeneficiaryProfile(data.accountUuid, data.data);
  }

  // ======================================================
  // DELETE / REMOVE METHODS
  // ======================================================

  /**
   * Remove Profile from Account
   */
  @GrpcMethod('ProfileService', 'RemoveProfile')
  async handleRemoveProfile(
    @Payload() data: { accountUuid: string; profileType: ProfileType },
  ): Promise<BaseResponseDto<null>> {
    this.logger.log(`[gRPC] Removing profile ${data.profileType} from account: ${data.accountUuid}`);
    return this.userService.removeProfile(data.accountUuid, data.profileType);
  }
}