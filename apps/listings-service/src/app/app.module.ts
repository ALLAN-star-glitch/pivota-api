import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {ConfigModule} from '@nestjs/config';
import { CategoriesModule } from '../business-modules/jobs-module/categories/categories.module';
import { JobsModule } from '../business-modules/jobs-module/jobs/jobs.module';
import { ProvidersModule } from '../business-modules/providers-module/providers.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV || 'dev'}`]
    }),
    CategoriesModule,
    JobsModule,
    ProvidersModule
    
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
