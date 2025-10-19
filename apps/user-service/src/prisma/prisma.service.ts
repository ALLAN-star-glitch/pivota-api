import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import { PrismaClient } from '../../generated/prisma';

//  Load environment variables from .env.dev before anything else
dotenv.config({ path: '.env.dev' });

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly configService: ConfigService) {
    //  You cannot access `this.configService` before calling super(),
    // so we extract the value safely first
    const databaseUrl =
      process.env.USER_SERVICE_DATABASE_URL ??
      configService.get<string>('USER_SERVICE_DATABASE_URL');

    if (!databaseUrl) {
      throw new Error('❌ USER_SERVICE_DATABASE_URL is not defined.');
    }
    
    // Call super() with the resolved database URL
    super({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });

    // ✅\ Log the initialization
    console.log(`✅ PrismaService initialized with USER_SERVICE_DATABASE_URL`);
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Connected to database successfully.');
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
