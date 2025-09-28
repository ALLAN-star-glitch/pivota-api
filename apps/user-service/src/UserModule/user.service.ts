import {
  Injectable,
  Logger,
  Inject,
  OnModuleInit,
  
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  BaseResponseDto,
  SignupRequestDto,
  UserResponseDto,
} from '@pivota-api/dtos';
import { User } from '../../generated/prisma';
import { ClientKafka, ClientProxy, RpcException } from '@nestjs/microservices';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class UserService implements OnModuleInit {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('USER_KAFKA') private readonly kafkaClient: ClientKafka,
    @Inject('USER_RMQ') private readonly rabbitClient: ClientProxy,
  ) {}

  async onModuleInit() {
    try {
      await this.kafkaClient.connect();
      this.logger.log('✅ UserService connected to Kafka');
    } catch (err) {
      this.logger.error('❌ Failed to connect Kafka client', err);
    }

    try {
      await this.rabbitClient.connect();
      this.logger.log('✅ UserService connected to RabbitMQ');
    } catch (err) {
      this.logger.error('❌ Failed to connect RabbitMQ client', err);
    }
  }

  /** ------------------ User Signup ------------------ */
 async createUserProfile(signupDto: SignupRequestDto): Promise<UserResponseDto> {
  try {
    const user = await this.prisma.user.create({
      data: {
        email: signupDto.email,
        firstName: signupDto.firstName,
        lastName: signupDto.lastName,
        ...(signupDto.phone ? { phone: signupDto.phone } : {}),
      },
    });

    const response = this.toUserResponse(user);

    // Kafka event
    this.kafkaClient.emit('user.created', {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      createdAt: user.createdAt,
    });

    // RabbitMQ event for welcome email
    this.rabbitClient.emit('user.signup.email', {
      to: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    });

    return response;
  } catch (error: unknown) {
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = (error.meta?.target as string[]) || [];
      if (target.includes('email')) throw new RpcException({ code: 'ALREADY_EXISTS', message: 'Email already registered' });
      if (target.includes('phone')) throw new RpcException({ code: 'ALREADY_EXISTS', message: 'Phone number already registered' });
      throw new RpcException({ code: 'ALREADY_EXISTS', message: 'Duplicate field detected' });
    }

    this.logger.error('❌ Unexpected error during signup', error);
    throw new RpcException({ code: 'INTERNAL', message: 'Failed to create user' });
  }
}

/** ------------------ gRPC-friendly Profile Fetch ------------------ */
  async getUserProfileByEmail(data: { email: string }): Promise<BaseResponseDto<UserResponseDto> | null> {
    const user = await this.prisma.user.findUnique({ where: { email: data.email } });
    const user$ = this.toUserResponse(user);
    const grpcBaseResponse = {
      success: true,
      message: "User retrieved successfully",
      code: "Ok",
      user: user$,
      error: null,
    }
    return user ? grpcBaseResponse : null;
  }

  async getUserProfileById(data: { id: string }): Promise<BaseResponseDto<UserResponseDto >| null> {
    const user = await this.prisma.user.findUnique({ where: { id: Number(data.id) } });
    const refinedUser =  user ? this.toUserResponse(user) : null;
    const grpcBaseResponse = {
      success: true,
      message: "User retrieved successfully",
      code: "Ok",
      user: refinedUser,
      error: null,
    }
    return user ? grpcBaseResponse : null;
    
  }


  /** Get all Users **/

  async getAllUsers(): Promise<BaseResponseDto<UserResponseDto[]>> {
    const users = await this.prisma.user.findMany();
    const users$ = users.map((u) => this.toUserResponse(u));



    const baseUsersResponse = {
      success: true,
      message: 'Users retrieved successfully',
      code: 'OK',
      users: users$,
      error: null,

      
    }

   return baseUsersResponse

   

  }

  /** ------------------ Mappers ------------------ */
  private toUserResponse(user: User): UserResponseDto {
    return {
      id: user.id?.toString(),  
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
