// apps/auth-service/src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.dev' });

import { PrismaClient } from '../../generated/prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

// Define the extended client type
export type ExtendedPrismaClient = PrismaClient & {
  $accelerate: {
    invalidate(options: { tags: string[] }): Promise<void>;
  };
};

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  public prisma: ExtendedPrismaClient;

  constructor(private readonly configService: ConfigService) {
    // Create base client
    const baseClient = new PrismaClient({
      accelerateUrl: configService.get<string>('AUTH_SERVICE_DATABASE_URL'),
      log: ['error', 'warn'],
    });

    // Extend Prisma Client with Accelerate
    this.prisma = baseClient.$extends(withAccelerate()) as unknown as ExtendedPrismaClient;
  }

  async onModuleInit() {
    try {
      await this.prisma.$connect();
      this.logger.log('✅ Connected to database via Prisma Accelerate.');
    } catch (error) {
      this.logger.error('❌ Failed to connect', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.prisma.$disconnect();
      this.logger.log('🧹 Prisma connection closed gracefully.');
    } catch (error) {
      this.logger.error('❌ Error during Prisma disconnect', error);
    }
  }
}