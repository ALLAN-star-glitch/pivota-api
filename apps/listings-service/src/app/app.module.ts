import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {ConfigModule} from '@nestjs/config';
import { JobsModule } from '../business-modules/jobs-module/jobs/jobs.module';
import { ContractorsModule } from '../business-modules/contractors-module/contractors.module';
import { CategoriesModule } from '../business-modules/categories/categories.module';
import { HousingModule } from '../business-modules/housing-module/housing.module';
import { SharedListingsModule } from '../business-modules/shared-listings/shared-listings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV || 'dev'}`]
    }),
    CategoriesModule,
    JobsModule,
    ContractorsModule,
    HousingModule,
    SharedListingsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
