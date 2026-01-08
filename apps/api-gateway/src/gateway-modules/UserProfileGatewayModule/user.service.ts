import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { AuthUserDto, BaseResponseDto, GetUserByEmailDto, GetUserByUserCodeDto, UserResponseDto } from '@pivota-api/dtos';
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
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private grpcService: UserServiceGrpc;

  constructor(@Inject('PROFILE_PACKAGE') private readonly grpcClient: ClientGrpc) {
    this.grpcService = this.grpcClient.getService<UserServiceGrpc>('ProfileService');
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
}

