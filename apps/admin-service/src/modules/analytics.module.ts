import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { HousingAnalyticsService } from './housing/business-analytics/services/housing-analytics.service';
import { HousingStorageService } from './housing/business-analytics/services/housing-storage.service';
import { HousingAnalyticsController } from './housing/business-analytics/controllers/housing-analytics.controller';
import { AuthAnalyticsService } from './auth/services/auth-analytics.service';
import { AuthAnalyticsController } from './auth/controllers/auth-analytics.controller';

import { HousingTrainingDataService } from './housing/ai-training/services/housing-training-data.service';
import { HousingTrainingDataController } from './housing/ai-training/controllers/housing-training-data.controller';
import { HousePreferencesService } from './housing/business-analytics/services/house-preferences.service';
import { HousePreferencesController } from './housing/business-analytics/controllers/house-preferences.controller';

@Module({
  imports: [PrismaModule],
  controllers: [
    HousingAnalyticsController,
    AuthAnalyticsController,
    HousingTrainingDataController,
    HousePreferencesController,
  ],
  providers: [
    HousingAnalyticsService,
    AuthAnalyticsService,
    HousingStorageService,
    AuthAnalyticsService,
    HousingTrainingDataService,
    HousePreferencesService,
  ],
  exports: [],
})
export class AnalyticsModule {}
