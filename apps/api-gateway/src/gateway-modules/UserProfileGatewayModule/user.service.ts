import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { 
  AuthUserDto, 
  BaseResponseDto, 
  GetUserByEmailDto, 
  GetUserByUserCodeDto, 
  UpdateFullUserProfileDto, 
  UserProfileResponseDto, 
  UserResponseDto, 
} from '@pivota-api/dtos';
import { firstValueFrom, Observable } from 'rxjs';


// ---------------- gRPC Interface ----------------
// Updated to match the latest .proto service definition
interface UserServiceGrpc {
  GetMyProfile(
    data: { userUuid: string }
  ): Observable<BaseResponseDto<UserProfileResponseDto>>;

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

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private grpcService: UserServiceGrpc;

  constructor(
    @Inject('PROFILE_PACKAGE') private readonly grpcClient: ClientGrpc,
    @Inject('AUTH_PACKAGE') private readonly authClient: ClientGrpc,
  ) {
    this.grpcService = this.grpcClient.getService<UserServiceGrpc>('ProfileService');
  }

  // ---------------- Get My Profile (Own Account) ----------------
  /**
   * Fetches the full profile aggregate for the authenticated user.
   * Called by the /me endpoint in the Gateway Controller.
   */
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

 

  // ---------------- Update User Profile ----------------
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