import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import { PrismaClient } from '../../generated/prisma';

//  Load environment variables from .env.dev before anything else
dotenv.config({ path: '.env.dev' });
import { PrismaPg } from '@prisma/adapter-pg';


@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly configService: ConfigService) {

   const adapter = new PrismaPg({
      connectionString: configService.get<string>('ADMIN_SERVICE_DATABASE_URL'),
    });


   
    
    // Call super() with the resolved database URL
    super({

      adapter
      
    });

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
