import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsISO8601, IsBoolean, IsIn } from "class-validator";

/* ======================================================
   USER LOGIN EMAIL DTO
   - Used for dispatching security alerts via Mailjet
====================================================== */
export class UserLoginEmailDto {
  @ApiProperty({ example: 'jane.doe@example.com' })
  @IsEmail()
  @IsNotEmpty()
  to!: string; 

  @ApiProperty({ example: 'Jane' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ example: 'New Login Detected' })
  @IsString()
  @IsNotEmpty()
  subject!: string;

  // Device Information
  @ApiProperty({ example: 'iPhone 15' })
  @IsString()
  @IsNotEmpty()
  device!: string;

  @ApiPropertyOptional({ 
    example: 'MOBILE',
    enum: ['MOBILE', 'TABLET', 'DESKTOP', 'BOT', 'UNKNOWN']
  })
  @IsOptional()
  @IsIn(['MOBILE', 'TABLET', 'DESKTOP', 'BOT', 'UNKNOWN'])
  deviceType?: 'MOBILE' | 'TABLET' | 'DESKTOP' | 'BOT' | 'UNKNOWN';

  // OS Information
  @ApiProperty({ example: 'iOS' })
  @IsString()
  @IsNotEmpty()
  os!: string;

  @ApiPropertyOptional({ example: '17.2' })
  @IsOptional()
  @IsString()
  osVersion?: string;

  // Browser Information
  @ApiPropertyOptional({ example: 'Safari' })
  @IsOptional()
  @IsString()
  browser?: string;

  @ApiPropertyOptional({ example: '17.2' })
  @IsOptional()
  @IsString()
  browserVersion?: string;

  @ApiProperty({ example: 'Safari' })
  @IsString()
  @IsNotEmpty()
  userAgent!: string;

  // Network Information
  @ApiProperty({ example: '192.168.1.1' })
  @IsString()
  @IsNotEmpty()
  ipAddress!: string;

  // Device Classification Flags
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isMobile?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isTablet?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isDesktop?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isBot?: boolean;

  // Timestamp
  @ApiProperty({ example: '2026-01-08T14:00:00Z' })
  @IsISO8601()
  @IsNotEmpty()
  timestamp!: string;

  // Organization Information (Optional)
  @ApiPropertyOptional({ example: 'Pivota Tech Ltd' })
  @IsOptional()
  @IsString()
  organizationName?: string; 

  @ApiPropertyOptional({ example: 'admin@pivotatech.com' })
  @IsOptional()
  @IsEmail()
  orgEmail?: string; 
}