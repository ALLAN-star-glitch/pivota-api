import {
  Controller,
  Get,
  Inject,
  Logger,
  OnModuleInit,
  Param,
  Version,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { GetUserByEmailDto, GetUserByIdDto, UserResponseDto } from '@pivota-api/dtos';

@Controller('users')
export class UserController implements OnModuleInit {
  private readonly logger = new Logger(UserController.name);

  constructor(@Inject('USER_SERVICE') private readonly userClient: ClientKafka) {}

  async onModuleInit() {
    // Subscribe to response topics from User Service
    this.userClient.subscribeToResponseOf('auth.getUserById');
    this.userClient.subscribeToResponseOf('user.getAll');
    this.userClient.subscribeToResponseOf('health.check');

    await this.userClient.connect();
    this.logger.log('✅ User Kafka client connected');
  }

  @Version('1')
  @Get('id/:id')
  async getUserById(@Param('id') id: string): Promise<UserResponseDto | null> {
    this.logger.log(`📩 Fetch user by ID: ${id}`);
    
    const dto: GetUserByIdDto = { id: Number(id) }; // construct DTO for service
    return firstValueFrom(
      this.userClient.send<UserResponseDto | null>('auth.getUserById', dto),
    );
  }

  //Get user by email
  @Version('1')
  @Get('email/:email')
  async getUserByEmail(@Param('email') email: string): Promise<UserResponseDto | null> {
    this.logger.log(`Fetch user by email: ${email}`);

    const dto: GetUserByEmailDto = { email }; // construct DTO for service

    return firstValueFrom(
      this.userClient.send<UserResponseDto | null>('user.getByEmail', {dto})
    )
  }



  // 🔹 Get all users
@Version('1')
@Get()
async getAllUsers(): Promise<UserResponseDto[]> {
  this.logger.log('📩 Fetch all users');

  // Explicit empty payload type
  const payload = {}; 
  return firstValueFrom(
    this.userClient.send<UserResponseDto[]>('user.getAll', payload),
  );
}


  // 🔹 Health check
  @Version('1')
  @Get('health/check')
  async healthCheck() {
    this.logger.log('📩 Health check request');
    return firstValueFrom(this.userClient.send('health.check', { ping: 'pong' }));
  }
}
