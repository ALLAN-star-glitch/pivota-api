import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { HousingAnalyticsService } from './services/housing/services/housing-analytics.service';
import { HousingStorageService } from './services/housing/services/housing-storage.service';
import { HousingAnalyticsController } from './services/housing/controllers/housing-analytics.controller';
import { AuthAnalyticsService } from './services/auth/services/auth-analytics.service';
import { AuthAnalyticsController } from './services/auth/controllers/auth-analytics.controller';

import { HousingTrainingDataController } from './services/housing/controllers/housing-training-data.controller';
import { HousingTrainingDataService } from './services/housing/services/housing-training-data.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    HousingAnalyticsController,
    AuthAnalyticsController,
    HousingTrainingDataController,
  ],
  providers: [
    HousingAnalyticsService,
    AuthAnalyticsService,
    HousingStorageService,
    AuthAnalyticsService,
    HousingTrainingDataService,
  ],
  exports: [],
})
export class AnalyticsModule {}
