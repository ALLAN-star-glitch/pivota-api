import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  IsDateString,
} from 'class-validator';

/**
 * DTO for querying notification activities
 */
export class NotificationActivityQueryDto {
  /**
   * Filter by channel type: 'sms' or 'email'
   */
  @IsOptional()
  @IsIn(['sms', 'email'], { message: 'channel must be either sms or email' })
  channel?: 'sms' | 'email';

  /**
   * Filter by status: 'success' or 'error'
   */
  @IsOptional()
  @IsIn(['success', 'error'], { message: 'status must be either success or error' })
  status?: 'success' | 'error';

  /**
   * Filter by recipient (email or phone number)
   */
  @IsOptional()
  @IsString({ message: 'recipient must be a string' })
  recipient?: string;

  /**
   * Limit number of results returned
   * Default: 50, Min: 1, Max: 200
   */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return 50;
    const parsed = Number(value);
    return isNaN(parsed) ? 50 : parsed;
  })
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(200, { message: 'limit cannot exceed 200' })
  limit?: number = 50;

  /**
   * Filter notifications starting from this ISO date
   */
  @IsOptional()
  @IsDateString({}, { message: 'startDate must be a valid ISO date string' })
  startDate?: string;

  /**
   * Filter notifications up to this ISO date
   */
  @IsOptional()
  @IsDateString({}, { message: 'endDate must be a valid ISO date string' })
  endDate?: string;
}
