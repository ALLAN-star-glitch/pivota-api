import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { AuthenticationModule } from '../modules/authentication/authentication.module';
import { OnboardingModule } from '../modules/onboarding/onboarding.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV || 'dev'}`],
    }),
    AuthenticationModule,
    OnboardingModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}