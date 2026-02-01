import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { AuthUserDto, BaseResponseDto, GetUserByEmailDto, GetUserByUserCodeDto, RequestOtpDto, UpdateFullUserProfileDto, UserProfileResponseDto, UserResponseDto, VerifyOtpDto, VerifyOtpResponseDataDto } from '@pivota-api/dtos';
import { firstValueFrom, Observable } from 'rxjs';



// ---------------- gRPC Interface ----------------
interface UserServiceGrpc {
  GetUserProfileByUserCode(
    data: GetUserByUserCodeDto,
  ): Observable<BaseResponseDto<UserResponseDto> | null>;
  
  GetUserProfileByEmail(
    data: GetUserByEmailDto,
  ): Observable<BaseResponseDto<AuthUserDto> | null>;

  GetAllUsers(data: object): Observable<BaseResponseDto<UserResponseDto[]>>;

  UpdateUserProfile(
    data: UpdateFullUserProfileDto
  ): Observable<BaseResponseDto<UserProfileResponseDto>>;
}

interface AuthServiceGrpc {
  RequestOtp(data: RequestOtpDto): Observable<BaseResponseDto<null>>;
  VerifyOtp(data: VerifyOtpDto): Observable<BaseResponseDto<VerifyOtpResponseDataDto>>;
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private grpcService: UserServiceGrpc;
  private authGrpc: AuthServiceGrpc;

  constructor(
    @Inject('PROFILE_PACKAGE') private readonly grpcClient: ClientGrpc,
    @Inject('AUTH_PACKAGE') private readonly authClient: ClientGrpc,) {
    this.grpcService = this.grpcClient.getService<UserServiceGrpc>('ProfileService');
    this.authGrpc = this.authClient.getService<AuthServiceGrpc>('AuthService');
  }

  // ---------------- Get User by User Code ----------------
  async getUserByUserCode(userCode: string): Promise<BaseResponseDto<UserResponseDto> | null> {
    this.logger.log(`Fetching user by User Code: ${userCode}`);
    
    const res = await firstValueFrom(
      this.grpcService.GetUserProfileByUserCode({ userCode }),
    );

    if (res && res.success) {
      return BaseResponseDto.ok(res.data, res.message, res.code);
    }

    this.logger.warn(`User not found for userCode: ${userCode}`);
    return BaseResponseDto.fail('User not found', 'NOT_FOUND');
  }

  // ---------------- Get User by Email ----------------
  async getUserByEmail(email: string): Promise<BaseResponseDto<AuthUserDto> | null> {
    this.logger.log(`Fetching user by email: ${email}`);
    
    const res = await firstValueFrom(
      this.grpcService.GetUserProfileByEmail({ email }),
    );

    if (res && res.success) {
      return BaseResponseDto.ok(res.data, res.message, res.code);
    }

    this.logger.warn(`User not found for email: ${email}`);
    return BaseResponseDto.fail('User not found', 'NOT_FOUND');
  }

  // ---------------- Get All Users ----------------
  async getAllUsers(): Promise<BaseResponseDto<UserResponseDto[]>> {
    this.logger.log('Fetching all users');
    
    const res = await firstValueFrom(this.grpcService.GetAllUsers({}));
    

    if (res.success) {
      return BaseResponseDto.ok(res.data || [], res.message, res.code);
    }

    return BaseResponseDto.fail(res.message, res.code);
  }

  /* ======================================================
     OTP LOGIC (FOR IDENTITY UPDATES & RECOVERY)
  ====================================================== */

  /**
   * Triggers an OTP send via Auth Service.
   * Can be used for logged-in users or recovery from login screen.
   */
  async requestUpdateOtp(dto: RequestOtpDto): Promise<BaseResponseDto<null>> {
    this.logger.log(`Requesting OTP for profile update/recovery: ${dto.email}`);
    
    // Hardcoding or ensuring the purpose is related to identity/profile changes
    const payload = { ...dto, purpose: dto.purpose || 'IDENTITY_UPDATE' };
    
    const res = await firstValueFrom(this.authGrpc.RequestOtp(payload));
    
    if (res && res.success) {
      return BaseResponseDto.ok(null, res.message, res.code);
    }
    return BaseResponseDto.fail(res.message, res.code);
  }

  /**
   * Verifies the OTP code provided by the user.
   */
  async verifyUpdateOtp(dto: VerifyOtpDto): Promise<BaseResponseDto<VerifyOtpResponseDataDto>> {
    this.logger.log(`Verifying OTP for: ${dto.email}`);
    
    const payload = { ...dto, purpose: dto.purpose || 'IDENTITY_UPDATE' };
    
    const res = await firstValueFrom(this.authGrpc.VerifyOtp(payload));
    
    if (res && res.success) {
      return BaseResponseDto.ok(res.data, res.message, res.code);
    }
    return BaseResponseDto.fail(res.message, res.code);
  }
  

  // ---------------- Update User Profile ----------------
  /**
   * Forwards the update request to the Profile Microservice.
   * Note: Security checks (IsAdmin or Self) should be handled in the Controller.
   */
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
}

