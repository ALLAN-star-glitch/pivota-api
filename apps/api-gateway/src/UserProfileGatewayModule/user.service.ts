import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import { AuthUserDto, BaseResponseDto, GetUserByEmailDto, GetUserByIdDto, UserResponseDto } from '@pivota-api/dtos';
import { BaseUserResponseGrpc, BaseUsersResponseGrpc } from '@pivota-api/interfaces';

interface UserServiceGrpc {
  GetUserProfileById(data: GetUserByIdDto): Observable<BaseUserResponseGrpc<UserResponseDto >| null>;
  GetUserProfileByEmail(data: GetUserByEmailDto): Observable<BaseUserResponseGrpc<AuthUserDto> | null>;
  GetAllUsers(data: object): Observable<BaseUsersResponseGrpc<UserResponseDto[]>>;
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private grpcService: UserServiceGrpc;

  constructor(@Inject('USER_PACKAGE') private readonly grpcClient: ClientGrpc) {
    this.grpcService = this.grpcClient.getService<UserServiceGrpc>('UserService');
  }

  async getUserById(id: string): Promise<BaseResponseDto<UserResponseDto> | null> {
   this.logger.log(`Fetching user by ID: ${id}`);
    const res =  firstValueFrom(this.grpcService.GetUserProfileById({ id }));
    if ((await res).success) {
      return BaseResponseDto.ok((await res).user, (await res).message, (await res).code)
    }
  }

  async getUserByEmail(email: string): Promise<BaseResponseDto<AuthUserDto >| null> {
    this.logger.log(`Fetching user by email: ${email}`);
    const res = firstValueFrom(this.grpcService.GetUserProfileByEmail({ email }));
    if ((await res).success){
      return BaseResponseDto.ok((await res).user, (await res).message, (await res).code)
    }
  }

  async getAllUsers(): Promise<BaseResponseDto<UserResponseDto[]>> {
    this.logger.log('Fetching all users');
    const res = await firstValueFrom(this.grpcService.GetAllUsers({}));
    this.logger.debug(`Grpc Response from user service: ${JSON.stringify(res)}`); 


    if (res.success) {  
      return BaseResponseDto.ok(res.users || [], res.message, res.code);  
    } else {
      return BaseResponseDto.fail(res.message, res.code); 
    }


  }
}
