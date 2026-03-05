import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { HousingAnalyticsService } from './services/housing/housing-analytics.service';
import { HousingStorageService } from './services/housing/housing-storage.service';
import { HousingAnalyticsController } from './controllers/housing-analytics.controller';

@Module({
  imports: [
    PrismaModule,
  ],
  controllers: [HousingAnalyticsController],
  providers: [HousingAnalyticsService, HousingStorageService],
  exports: [],
})
export class AnalyticsModule {}
