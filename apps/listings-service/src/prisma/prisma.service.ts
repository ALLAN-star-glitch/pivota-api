import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.dev' });

import { PrismaClient } from '../../generated/prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  [x: string]: any;
  private readonly logger = new Logger(PrismaService.name);
  category: any;
  houseListing: any;
  houseViewing: any;

  constructor(private readonly configService: ConfigService) {
    super({
      accelerateUrl: configService.get<string>('LISTINGS_SERVICE_DATABASE_URL'),
    });

    // Extend Prisma Client with Accelerate
    return this.$extends(withAccelerate()) as this;
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Connected to database via Prisma Accelerate.');
    } catch (error) {
      this.logger.error('❌ Failed to connect', error);
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
