import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import { AuthUserDto, GetUserByEmailDto, GetUserByIdDto, UserResponseDto } from '@pivota-api/dtos';

interface UserServiceGrpc {
  GetUserProfileById(data: GetUserByIdDto): Observable<UserResponseDto | null>;
  GetUserProfileByEmail(data: GetUserByEmailDto): Observable<AuthUserDto | null>;
  GetAllUsers(data: object): Observable<{ users: UserResponseDto[] }>;
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private grpcService: UserServiceGrpc;

  constructor(@Inject('USER_PACKAGE') private readonly grpcClient: ClientGrpc) {
    this.grpcService = this.grpcClient.getService<UserServiceGrpc>('UserService');
  }

  async getUserById(id: string): Promise<UserResponseDto | null> {
    this.logger.log(`Fetching user by ID: ${id}`);
    return firstValueFrom(this.grpcService.GetUserProfileById({ id }));
  }

  async getUserByEmail(email: string): Promise<AuthUserDto | null> {
    this.logger.log(`Fetching user by email: ${email}`);
    return firstValueFrom(this.grpcService.GetUserProfileByEmail({ email }));
  }

  async getAllUsers(): Promise<UserResponseDto[]> {
    this.logger.log('Fetching all users');
    const res = await firstValueFrom(this.grpcService.GetAllUsers({}));
    return res.users;
  }
}
