import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClientKafka, MessagePattern, Payload } from '@nestjs/microservices';
import { SignupDto, LoginDto, UserDto } from '@pivota-api/shared-dtos';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService implements OnModuleInit {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly prisma: PrismaService,
    @Inject('KAFKA_SERVICE')
    private readonly kafkaclient: ClientKafka
  ) {}


  async onModuleInit() {
    this.logger.log('Initializing UserService...');

    // 1️⃣ Check database connection
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      this.logger.log('✅ Database connection OK');
    } catch (error) {
      this.logger.error('❌ Database connection failed', error);
    }

    // 2️⃣ Log topic subscriptions
    this.logger.log(
      'Listening to Kafka topics: user.signup, auth.login, auth.getUserById',
    );

    this.logger.log('UserService ready to handle Kafka messages ✅');
  }

  // 🔹 Handle signup messages
  @MessagePattern('user.signup')
  async handleSignup(@Payload() signupDto: SignupDto): Promise<UserDto | null> {
    console.log('Received signup request:', signupDto);
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: signupDto.email },
      });
      if (existingUser) return null;

      const user = await this.prisma.user.create({
        data: {
          email: signupDto.email,
          password: signupDto.password, // Already hashed by AuthService
          name: signupDto.name,
        },
      });

      return { id: user.id, email: user.email, name: user.name };
    } catch (error) {
      this.logger.error('Error creating user', error);
      return null;
    }
  }

  // 🔹 Handle login messages
  @MessagePattern('auth.login')
  async handleLogin(@Payload() loginDto: LoginDto): Promise<UserDto | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: loginDto.email },
      });
      if (!user) return null;

      const passwordValid = await bcrypt.compare(loginDto.password, user.password);
      if (!passwordValid) return null;

      return { id: user.id, email: user.email, name: user.name };
    } catch (error) {
      this.logger.error('Error logging in user', error);
      return null;
    }
  }

  // 🔹 Fetch user by ID (for refresh token)
  @MessagePattern('auth.getUserById')
  async getUserById(@Payload() payload: { id: number }): Promise<UserDto | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.id },
      });
      if (!user) return null;

      return { id: user.id, email: user.email, name: user.name };
    } catch (error) {
      this.logger.error('Error fetching user by ID', error);
      return null;
    }
  }

  //Fetch all users

// Inside UserService

async getAllUsers(): Promise<UserDto[]> {
  const users = await this.prisma.user.findMany();
  return users.map((user: { id: number; email: string; name: string }) => ({ id: user.id, email: user.email, name: user.name }));
}

}
