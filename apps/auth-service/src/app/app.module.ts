import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, //Make config available accross all modules
      envFilePath: [`.env.${process.env.NODE_ENV || 'dev'}`], // Loads .env.dev or .env.prod depending on NODE_ENV
    }),
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
