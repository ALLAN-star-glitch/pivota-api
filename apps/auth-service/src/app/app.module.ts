import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';
import { AuthController } from './auth.controller';

@Module({
  imports: [],
  controllers: [AppController, HealthController, AuthController],
  providers: [AppService],
})
export class AppModule {}
