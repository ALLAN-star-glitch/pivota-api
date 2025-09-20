/* eslint-disable @typescript-eslint/no-empty-object-type */
import {
  Controller,
  Get,
  Inject,
  Logger,
  OnModuleInit,
  Param,
  Version,
} from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, map, Observable } from 'rxjs';
import { AuthUserDto, GetUserByEmailDto, GetUserByIdDto, UserResponseDto } from '@pivota-api/dtos';

interface UserServiceGrpc {
  GetUserById(data: GetUserByIdDto): Observable<UserResponseDto | null>;
  GetUserByEmail(data: GetUserByEmailDto): Observable<AuthUserDto | null>;
  GetAllUsers(data: {}): Observable<{ users: UserResponseDto[] }>;

}

@Controller('users')
export class UserController implements OnModuleInit {
  private readonly logger = new Logger(UserController.name);
  private userService: UserServiceGrpc; 

  constructor(@Inject('USER_PACKAGE') private readonly grpcClient: ClientGrpc) {}

  async onModuleInit() {
    this.userService = this.grpcClient.getService<UserServiceGrpc>('UserService');
    this.logger.log(' API Gateway connected to User Service (gRPC)');
  }

  @Version('1')
  @Get('id/:id')
  async getUserById(@Param('id') id: string): Promise<UserResponseDto | null> {
    this.logger.log(`Fetch user by ID: ${id}`);
    
    const dto: GetUserByIdDto = { id }; // construct DTO for service
    return firstValueFrom(
      this.userService.GetUserById(dto)
    );
  }

  //Get user by email
  @Version('1')
  @Get('email/:email')
  async getUserByEmail(@Param('email') email: string): Promise<AuthUserDto | null> {
    this.logger.log(`Fetch user by email: ${email}`);

    const dto: GetUserByEmailDto = { email }; // construct DTO for service

    return firstValueFrom(
      this.userService.GetUserByEmail(dto)
    )
  }



  // 🔹 Get all users
@Version('1')
@Get()
async getAllUsers(): Promise<UserResponseDto[]> {
  this.logger.log('📩 Fetch all users');

  return firstValueFrom(
    this.userService.GetAllUsers({}).pipe(
      map(res => res.users) // ✅ unwrap here
    )
  );
}
}
