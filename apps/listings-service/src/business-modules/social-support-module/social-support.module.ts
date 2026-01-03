import { Module } from '@nestjs/common';
import { SocialSupportService } from './social-support.service';
import { SocialSupportController } from './social-support.controller';

@Module({
  providers: [SocialSupportService],
  controllers: [SocialSupportController],
})
export class SocialSupportModule {}
