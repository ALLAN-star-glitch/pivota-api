import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {ConfigModule} from '@nestjs/config'
import {CategoriesModule} from '../modules/categories/categories.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV || 'dev'}`]
    }),
    CategoriesModule

  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
