import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { NotificationChannel, NotificationStatus } from './notification-activity.service';

export class NotificationHistoryQueryDto {
  @IsOptional()
  @IsIn(['sms', 'email'])
  channel?: NotificationChannel;

  @IsOptional()
  @IsIn(['success', 'error'])
  status?: NotificationStatus;

  @IsOptional()
  @IsString()
  recipient?: string;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : 50))
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number = 50;
}
