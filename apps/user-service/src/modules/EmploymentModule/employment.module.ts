import { Module } from '@nestjs/common';
import { EmploymentController } from './employment.controller';
import { EmploymentService } from './employment.service';

@Module({
  controllers: [EmploymentController],
  providers: [EmploymentService],
})
export class EmploymentModule {}
