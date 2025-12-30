import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {ConfigModule} from '@nestjs/config';
import { JobsModule } from '../business-modules/jobs-module/jobs/jobs.module';
import { ProvidersModule } from '../business-modules/providers-module/providers.module';
import { CategoriesModule } from '../business-modules/categories/categories.module';

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
