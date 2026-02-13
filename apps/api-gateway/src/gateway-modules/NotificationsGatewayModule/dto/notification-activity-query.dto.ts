import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class NotificationActivityQueryDto {
  @IsOptional()
  @IsIn(['sms', 'email'])
  channel?: 'sms' | 'email';

  @IsOptional()
  @IsIn(['success', 'error'])
  status?: 'success' | 'error';

  @IsOptional()
  @IsString()
  recipient?: string;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : 50))
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}
