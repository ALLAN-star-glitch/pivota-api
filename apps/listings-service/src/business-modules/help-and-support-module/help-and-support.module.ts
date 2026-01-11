import { Module } from '@nestjs/common';
import { HelpAndSupportService } from './help-and-support.service';
import { HelpAndSupportController } from './help-and-support.controller';

@Module({
  providers: [HelpAndSupportService],
  controllers: [HelpAndSupportController],
})
export class SocialSupportModule {}
