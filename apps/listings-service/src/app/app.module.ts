import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {ConfigModule} from '@nestjs/config';
import { JobsModule } from '../business-modules/jobs-module/jobs/jobs.module';
import { ContractorsModule } from '../business-modules/contractors-module/contractors.module';
import { CategoriesModule } from '../business-modules/categories/categories.module';
import { HousingModule } from '../business-modules/housing-module/housing.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV || 'dev'}`]
    }),
    CategoriesModule,
    JobsModule,
    ContractorsModule,
    HousingModule
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
