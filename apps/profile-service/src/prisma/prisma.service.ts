import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import { PrismaClient } from '../../generated/prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

// Load environment variables early
dotenv.config({ path: '.env.dev' });

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly configService: ConfigService) {
    super({
      // 👇 THIS enables HTTPS (443) via Prisma Accelerate
      accelerateUrl: configService.get<string>(
        'PROFILE_SERVICE_DATABASE_URL',
      ),
    });

    // 👇 This is what "extend Prisma Client" means
    return this.$extends(withAccelerate()) as this;
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Connected to database via Prisma Accelerate.');
    } catch (error) {
      this.logger.error('❌ Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('🧹 Prisma connection closed gracefully.');
    } catch (error) {
      this.logger.error('❌ Error during Prisma disconnect', error);
    }
  }
}
