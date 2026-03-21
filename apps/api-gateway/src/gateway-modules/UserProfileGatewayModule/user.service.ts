import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { 
  AuthUserDto, 
  BaseResponseDto, 
  ContractorProfileResponseDto, 
  GetUserByEmailDto, 
  GetUserByUserCodeDto, 
  JobSeekerProfileResponseDto, 
  OnboardProviderGrpcRequestDto, 
  UpdateFullUserProfileDto, 
  UpdateJobSeekerGrpcRequestDto, 
  UserProfileResponseDto, 
  UserResponseDto,
  // Individual Onboarding DTOs
  CreateAccountWithProfilesRequestDto,
  AccountResponseDto,
  // Individual Profile Data DTOs
  JobSeekerProfileDataDto,
  SkilledProfessionalProfileDataDto,
  IntermediaryAgentProfileDataDto,
  HousingSeekerProfileDataDto,
  PropertyOwnerProfileDataDto,
  SupportBeneficiaryProfileDataDto,
  // Individual Profile Update DTOs
  UpdateSkilledProfessionalGrpcRequestDto,
  UpdateHousingSeekerGrpcRequestDto,
  UpdatePropertyOwnerGrpcRequestDto,
  UpdateSupportBeneficiaryGrpcRequestDto,
  UpdateIntermediaryAgentGrpcRequestDto,
  // Individual Profile Response DTOs
  SkilledProfessionalProfileResponseDto,
  HousingSeekerProfileResponseDto,
  PropertyOwnerProfileResponseDto,
  SupportBeneficiaryProfileResponseDto,
  IntermediaryAgentProfileResponseDto,
} from '@pivota-api/dtos';
import { firstValueFrom, Observable } from 'rxjs';
import { StorageService } from '@pivota-api/shared-storage';
import { ProfileType } from '@pivota-api/constants';

// ---------------- gRPC Interface ----------------
interface ProfileServiceGrpc {
  // INDIVIDUAL ONBOARDING
  CreateIndividualAccountWithProfiles(
    data: CreateAccountWithProfilesRequestDto
  ): Observable<BaseResponseDto<AccountResponseDto>>;
  
  CreateJobSeekerProfile(
    data: { accountUuid: string; data: JobSeekerProfileDataDto }
  ): Observable<BaseResponseDto<JobSeekerProfileResponseDto>>;
  
  CreateSkilledProfessionalProfile(
    data: { accountUuid: string; data: SkilledProfessionalProfileDataDto }
  ): Observable<BaseResponseDto<SkilledProfessionalProfileResponseDto>>;
  
  CreateIntermediaryAgentProfile(
    data: { accountUuid: string; data: IntermediaryAgentProfileDataDto }
  ): Observable<BaseResponseDto<IntermediaryAgentProfileResponseDto>>;
  
  CreateHousingSeekerProfile(
    data: { accountUuid: string; data: HousingSeekerProfileDataDto }
  ): Observable<BaseResponseDto<HousingSeekerProfileResponseDto>>;
  
  CreatePropertyOwnerProfile(
    data: { accountUuid: string; data: PropertyOwnerProfileDataDto }
  ): Observable<BaseResponseDto<PropertyOwnerProfileResponseDto>>;
  
  CreateSupportBeneficiaryProfile(
    data: { accountUuid: string; data: SupportBeneficiaryProfileDataDto }
  ): Observable<BaseResponseDto<SupportBeneficiaryProfileResponseDto>>;
  
  // PROFILE RETRIEVAL
  GetMyProfile(
    data: { userUuid: string }
  ): Observable<BaseResponseDto<UserProfileResponseDto>>;
  
  GetUserProfileByUuid(
    data: { userUuid: string }
  ): Observable<BaseResponseDto<UserProfileResponseDto>>;
  
  GetUserProfileByUserCode(
    data: GetUserByUserCodeDto
  ): Observable<BaseResponseDto<UserResponseDto>>;
  
  GetUserProfileByEmail(
    data: GetUserByEmailDto
  ): Observable<BaseResponseDto<AuthUserDto>>;
  
  GetAccountByUuid(
    data: { accountUuid: string }
  ): Observable<BaseResponseDto<AccountResponseDto>>;
  
  GetAllUsers(
    data: object
  ): Observable<BaseResponseDto<UserResponseDto[]>>;
  
  // PROFILE UPDATES
  UpdateUserProfile(
    data: UpdateFullUserProfileDto
  ): Observable<BaseResponseDto<UserProfileResponseDto>>;
  
  UpdateJobSeekerProfile(
    data: UpdateJobSeekerGrpcRequestDto
  ): Observable<BaseResponseDto<JobSeekerProfileResponseDto>>;
  
  UpdateSkilledProfessionalProfile(
    data: UpdateSkilledProfessionalGrpcRequestDto
  ): Observable<BaseResponseDto<SkilledProfessionalProfileResponseDto>>;
  
  UpdateHousingSeekerProfile(
    data: UpdateHousingSeekerGrpcRequestDto
  ): Observable<BaseResponseDto<HousingSeekerProfileResponseDto>>;
  
  UpdatePropertyOwnerProfile(
    data: UpdatePropertyOwnerGrpcRequestDto
  ): Observable<BaseResponseDto<PropertyOwnerProfileResponseDto>>;
  
  UpdateSupportBeneficiaryProfile(
    data: UpdateSupportBeneficiaryGrpcRequestDto
  ): Observable<BaseResponseDto<SupportBeneficiaryProfileResponseDto>>;
  
  UpdateIntermediaryAgentProfile(
    data: UpdateIntermediaryAgentGrpcRequestDto
  ): Observable<BaseResponseDto<IntermediaryAgentProfileResponseDto>>;
  
  // REMOVE PROFILE
  RemoveProfile(
    data: { accountUuid: string; profileType: ProfileType }
  ): Observable<BaseResponseDto<null>>;
  
  // PROVIDER ONBOARDING
  OnboardIndividualProvider(
    data: OnboardProviderGrpcRequestDto
  ): Observable<BaseResponseDto<ContractorProfileResponseDto>>;
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private grpcService: ProfileServiceGrpc;

  constructor(
    @Inject('PROFILE_PACKAGE') private readonly grpcClient: ClientGrpc,
    @Inject('AUTH_PACKAGE') private readonly authClient: ClientGrpc,
    private readonly storage: StorageService,
  ) {
    this.grpcService = this.grpcClient.getService<ProfileServiceGrpc>('ProfileService');
  }

  // ======================================================
  // INDIVIDUAL ONBOARDING
  // ======================================================

  async createIndividualAccountWithProfiles(
    data: CreateAccountWithProfilesRequestDto
  ): Promise<BaseResponseDto<AccountResponseDto>> {
    this.logger.log(`Creating individual account: ${data.email}`);
    
    try {
      const res = await firstValueFrom(
        this.grpcService.CreateIndividualAccountWithProfiles(data)
      );

      if (res && res.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res.message || 'Account creation failed', res.code || 'INTERNAL_ERROR');
    } catch (err) {
      this.logger.error(`gRPC Error creating individual account: ${err.message}`);
      return BaseResponseDto.fail('Profile service communication error', 'SERVICE_UNAVAILABLE');
    }
  }

  async createJobSeekerProfile(
    accountUuid: string,
    data: JobSeekerProfileDataDto
  ): Promise<BaseResponseDto<JobSeekerProfileResponseDto>> {
    this.logger.log(`Creating job seeker profile for account: ${accountUuid}`);
    
    try {
      const res = await firstValueFrom(
        this.grpcService.CreateJobSeekerProfile({ accountUuid, data })
      );

      if (res && res.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res.message || 'Profile creation failed', res.code || 'INTERNAL_ERROR');
    } catch (err) {
      this.logger.error(`gRPC Error creating job seeker profile: ${err.message}`);
      return BaseResponseDto.fail('Profile service communication error', 'SERVICE_UNAVAILABLE');
    }
  }

  async createSkilledProfessionalProfile(
    accountUuid: string,
    data: SkilledProfessionalProfileDataDto
  ): Promise<BaseResponseDto<SkilledProfessionalProfileResponseDto>> {
    this.logger.log(`Creating skilled professional profile for account: ${accountUuid}`);
    
    try {
      const res = await firstValueFrom(
        this.grpcService.CreateSkilledProfessionalProfile({ accountUuid, data })
      );

      if (res && res.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res.message || 'Profile creation failed', res.code || 'INTERNAL_ERROR');
    } catch (err) {
      this.logger.error(`gRPC Error creating skilled professional profile: ${err.message}`);
      return BaseResponseDto.fail('Profile service communication error', 'SERVICE_UNAVAILABLE');
    }
  }

  async createIntermediaryAgentProfile(
    accountUuid: string,
    data: IntermediaryAgentProfileDataDto
  ): Promise<BaseResponseDto<IntermediaryAgentProfileResponseDto>> {
    this.logger.log(`Creating intermediary agent profile for account: ${accountUuid}`);
    
    try {
      const res = await firstValueFrom(
        this.grpcService.CreateIntermediaryAgentProfile({ accountUuid, data })
      );

      if (res && res.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res.message || 'Profile creation failed', res.code || 'INTERNAL_ERROR');
    } catch (err) {
      this.logger.error(`gRPC Error creating intermediary agent profile: ${err.message}`);
      return BaseResponseDto.fail('Profile service communication error', 'SERVICE_UNAVAILABLE');
    }
  }

  async createHousingSeekerProfile(
    accountUuid: string,
    data: HousingSeekerProfileDataDto
  ): Promise<BaseResponseDto<HousingSeekerProfileResponseDto>> {
    this.logger.log(`Creating housing seeker profile for account: ${accountUuid}`);
    
    try {
      const res = await firstValueFrom(
        this.grpcService.CreateHousingSeekerProfile({ accountUuid, data })
      );

      if (res && res.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res.message || 'Profile creation failed', res.code || 'INTERNAL_ERROR');
    } catch (err) {
      this.logger.error(`gRPC Error creating housing seeker profile: ${err.message}`);
      return BaseResponseDto.fail('Profile service communication error', 'SERVICE_UNAVAILABLE');
    }
  }

  async createPropertyOwnerProfile(
    accountUuid: string,
    data: PropertyOwnerProfileDataDto
  ): Promise<BaseResponseDto<PropertyOwnerProfileResponseDto>> {
    this.logger.log(`Creating property owner profile for account: ${accountUuid}`);
    
    try {
      const res = await firstValueFrom(
        this.grpcService.CreatePropertyOwnerProfile({ accountUuid, data })
      );

      if (res && res.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res.message || 'Profile creation failed', res.code || 'INTERNAL_ERROR');
    } catch (err) {
      this.logger.error(`gRPC Error creating property owner profile: ${err.message}`);
      return BaseResponseDto.fail('Profile service communication error', 'SERVICE_UNAVAILABLE');
    }
  }

  async createSupportBeneficiaryProfile(
    accountUuid: string,
    data: SupportBeneficiaryProfileDataDto
  ): Promise<BaseResponseDto<SupportBeneficiaryProfileResponseDto>> {
    this.logger.log(`Creating support beneficiary profile for account: ${accountUuid}`);
    
    try {
      const res = await firstValueFrom(
        this.grpcService.CreateSupportBeneficiaryProfile({ accountUuid, data })
      );

      if (res && res.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res.message || 'Profile creation failed', res.code || 'INTERNAL_ERROR');
    } catch (err) {
      this.logger.error(`gRPC Error creating support beneficiary profile: ${err.message}`);
      return BaseResponseDto.fail('Profile service communication error', 'SERVICE_UNAVAILABLE');
    }
  }

  // ======================================================
  // PROFILE RETRIEVAL
  // ======================================================

  async getMyProfile(userUuid: string): Promise<BaseResponseDto<UserProfileResponseDto>> {
    this.logger.log(`Requesting own profile from gRPC for user: ${userUuid}`);

    try {
      const res = await firstValueFrom(
        this.grpcService.GetMyProfile({ userUuid }),
      );

      if (res && res.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res.message || 'Could not fetch your profile', res.code || 'NOT_FOUND');
    } catch (err) {
      this.logger.error(`gRPC Error fetching profile for ${userUuid}`, err);
      return BaseResponseDto.fail('Profile service communication error', 'SERVICE_UNAVAILABLE');
    }
  }

  async getUserProfileByUuid(userUuid: string): Promise<BaseResponseDto<UserProfileResponseDto>> {
    this.logger.log(`Fetching user profile by UUID: ${userUuid}`);
    
    try {
      const res = await firstValueFrom(
        this.grpcService.GetUserProfileByUuid({ userUuid })
      );

      if (res && res.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res.message || 'User not found', res.code || 'NOT_FOUND');
    } catch (err) {
      this.logger.error(`gRPC Error fetching user profile: ${err.message}`);
      return BaseResponseDto.fail('Profile service communication error', 'SERVICE_UNAVAILABLE');
    }
  }

  async getUserByUserCode(userCode: string): Promise<BaseResponseDto<UserResponseDto>> {
    this.logger.log(`Fetching user by User Code: ${userCode}`);
    
    const res = await firstValueFrom(
      this.grpcService.GetUserProfileByUserCode({ userCode }),
    );

    if (res && res.success) {
      return BaseResponseDto.ok(res.data, res.message, res.code);
    }

    return BaseResponseDto.fail(res.message || 'User not found', res.code || 'NOT_FOUND');
  }

  async getUserByEmail(email: string): Promise<BaseResponseDto<AuthUserDto>> {
    this.logger.log(`Fetching user by email: ${email}`);
    
    const res = await firstValueFrom(
      this.grpcService.GetUserProfileByEmail({ email }),
    );

    if (res && res.success) {
      return BaseResponseDto.ok(res.data, res.message, res.code);
    }

    return BaseResponseDto.fail(res.message || 'User not found', res.code || 'NOT_FOUND');
  }

  async getAccountByUuid(accountUuid: string): Promise<BaseResponseDto<AccountResponseDto>> {
    this.logger.log(`Fetching account by UUID: ${accountUuid}`);
    
    try {
      const res = await firstValueFrom(
        this.grpcService.GetAccountByUuid({ accountUuid })
      );

      if (res && res.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res.message || 'Account not found', res.code || 'NOT_FOUND');
    } catch (err) {
      this.logger.error(`gRPC Error fetching account: ${err.message}`);
      return BaseResponseDto.fail('Profile service communication error', 'SERVICE_UNAVAILABLE');
    }
  }

  async getAllUsers(): Promise<BaseResponseDto<UserResponseDto[]>> {
    this.logger.log('Fetching all users');
    
    const res = await firstValueFrom(this.grpcService.GetAllUsers({}));
    
    if (res.success) {
      return BaseResponseDto.ok(res.data || [], res.message, res.code);
    }

    return BaseResponseDto.fail(res.message, res.code);
  }

  // ======================================================
  // PROFILE UPDATES
  // ======================================================

  async updateProfile(dto: UpdateFullUserProfileDto): Promise<BaseResponseDto<UserProfileResponseDto>> {
    this.logger.log(`Forwarding profile update for user: ${dto.userUuid}`);

    try {
      const res = await firstValueFrom(this.grpcService.UpdateUserProfile(dto));
      
      if (res && res.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res.message || 'Update failed', res.code || 'INTERNAL');
    } catch (err) {
      this.logger.error(`gRPC Error updating profile for ${dto.userUuid}`, err);
      return BaseResponseDto.fail('Profile service communication error', 'SERVICE_UNAVAILABLE');
    }
  }

  async updateJobSeekerProfile(
    dto: UpdateJobSeekerGrpcRequestDto
  ): Promise<BaseResponseDto<JobSeekerProfileResponseDto>> {
    this.logger.log(`Forwarding job seeker update for user: ${dto.userUuid}`);

    try {
      const res = await firstValueFrom(this.grpcService.UpdateJobSeekerProfile(dto));

      if (res && res.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res.message || 'Job profile update failed', res.code || 'INTERNAL_ERROR');
    } catch (err) {
      this.logger.error(`gRPC Error updating job profile for ${dto.userUuid}`, err);
      return BaseResponseDto.fail('Profile service communication error', 'SERVICE_UNAVAILABLE');
    }
  }

  async updateSkilledProfessionalProfile(
    dto: UpdateSkilledProfessionalGrpcRequestDto
  ): Promise<BaseResponseDto<SkilledProfessionalProfileResponseDto>> {
    this.logger.log(`Forwarding skilled professional update for account: ${dto.accountUuid}`);

    try {
      const res = await firstValueFrom(this.grpcService.UpdateSkilledProfessionalProfile(dto));

      if (res && res.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res.message || 'Profile update failed', res.code || 'INTERNAL_ERROR');
    } catch (err) {
      this.logger.error(`gRPC Error updating skilled professional profile: ${err.message}`);
      return BaseResponseDto.fail('Profile service communication error', 'SERVICE_UNAVAILABLE');
    }
  }

  async updateHousingSeekerProfile(
    dto: UpdateHousingSeekerGrpcRequestDto
  ): Promise<BaseResponseDto<HousingSeekerProfileResponseDto>> {
    this.logger.log(`Forwarding housing seeker update for account: ${dto.accountUuid}`);

    try {
      const res = await firstValueFrom(this.grpcService.UpdateHousingSeekerProfile(dto));

      if (res && res.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res.message || 'Profile update failed', res.code || 'INTERNAL_ERROR');
    } catch (err) {
      this.logger.error(`gRPC Error updating housing seeker profile: ${err.message}`);
      return BaseResponseDto.fail('Profile service communication error', 'SERVICE_UNAVAILABLE');
    }
  }

  async updatePropertyOwnerProfile(
    dto: UpdatePropertyOwnerGrpcRequestDto
  ): Promise<BaseResponseDto<PropertyOwnerProfileResponseDto>> {
    this.logger.log(`Forwarding property owner update for account: ${dto.accountUuid}`);

    try {
      const res = await firstValueFrom(this.grpcService.UpdatePropertyOwnerProfile(dto));

      if (res && res.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res.message || 'Profile update failed', res.code || 'INTERNAL_ERROR');
    } catch (err) {
      this.logger.error(`gRPC Error updating property owner profile: ${err.message}`);
      return BaseResponseDto.fail('Profile service communication error', 'SERVICE_UNAVAILABLE');
    }
  }

  async updateSupportBeneficiaryProfile(
    dto: UpdateSupportBeneficiaryGrpcRequestDto
  ): Promise<BaseResponseDto<SupportBeneficiaryProfileResponseDto>> {
    this.logger.log(`Forwarding support beneficiary update for account: ${dto.accountUuid}`);

    try {
      const res = await firstValueFrom(this.grpcService.UpdateSupportBeneficiaryProfile(dto));

      if (res && res.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res.message || 'Profile update failed', res.code || 'INTERNAL_ERROR');
    } catch (err) {
      this.logger.error(`gRPC Error updating support beneficiary profile: ${err.message}`);
      return BaseResponseDto.fail('Profile service communication error', 'SERVICE_UNAVAILABLE');
    }
  }

  async updateIntermediaryAgentProfile(
    dto: UpdateIntermediaryAgentGrpcRequestDto
  ): Promise<BaseResponseDto<IntermediaryAgentProfileResponseDto>> {
    this.logger.log(`Forwarding intermediary agent update for account: ${dto.accountUuid}`);

    try {
      const res = await firstValueFrom(this.grpcService.UpdateIntermediaryAgentProfile(dto));

      if (res && res.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res.message || 'Profile update failed', res.code || 'INTERNAL_ERROR');
    } catch (err) {
      this.logger.error(`gRPC Error updating intermediary agent profile: ${err.message}`);
      return BaseResponseDto.fail('Profile service communication error', 'SERVICE_UNAVAILABLE');
    }
  }

  // ======================================================
  // REMOVE PROFILE
  // ======================================================

  async removeProfile(
    accountUuid: string,
    profileType: ProfileType
  ): Promise<BaseResponseDto<null>> {
    this.logger.log(`Removing profile ${profileType} from account: ${accountUuid}`);

    try {
      const res = await firstValueFrom(
        this.grpcService.RemoveProfile({ accountUuid, profileType })
      );

      if (res && res.success) {
        return BaseResponseDto.ok(null, res.message, res.code);
      }

      return BaseResponseDto.fail(res.message || 'Failed to remove profile', res.code || 'INTERNAL_ERROR');
    } catch (err) {
      this.logger.error(`gRPC Error removing profile: ${err.message}`);
      return BaseResponseDto.fail('Profile service communication error', 'SERVICE_UNAVAILABLE');
    }
  }

  // ======================================================
  // PROVIDER ONBOARDING
  // ======================================================

  async onboardIndividualProvider(
    dto: OnboardProviderGrpcRequestDto
  ): Promise<BaseResponseDto<ContractorProfileResponseDto>> {
    this.logger.log(`Forwarding provider onboarding for user: ${dto.userUuid}`);

    try {
      const res = await firstValueFrom(
        this.grpcService.OnboardIndividualProvider(dto)
      );

      if (res && res.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(
        res.message || 'Onboarding failed', 
        res.code || 'INTERNAL_ERROR'
      );
    } catch (err) {
      this.logger.error(`gRPC Error during provider onboarding for ${dto.userUuid}`, err);
      return BaseResponseDto.fail('Profile service communication error', 'SERVICE_UNAVAILABLE');
    }
  }

  // ======================================================
  // STORAGE UTILITY METHODS
  // ======================================================
  
  async uploadToStorage(
    file: Express.Multer.File, 
    folder: string, 
    bucketName = 'pivota-public'
  ): Promise<string> {
    return this.storage.uploadFile(file, folder, bucketName);
  }

  async deleteFromStorage(
    urls: string[], 
    bucketName = 'pivota-public'
  ): Promise<void> {
    if (!urls || urls.length === 0) return;

    try {
      this.logger.warn(`Initiating storage cleanup for ${urls.length} files in ${bucketName}`);
      await this.storage.deleteFiles(urls, bucketName);
    } catch (error) {
      this.logger.error(
        `Failed to clean up orphaned profile files: ${error instanceof Error ? error.message : 'Unknown Error'}`
      );
    }
  }
}