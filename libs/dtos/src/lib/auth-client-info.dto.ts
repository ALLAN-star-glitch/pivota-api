import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn, IsIP, IsBoolean } from 'class-validator';

export class AuthClientInfoDto {
  @ApiProperty({
    description: 'IP address of the client',
    example: '192.168.1.1'
  })
  @IsString()
  @IsOptional()
  @IsIP()
  ipAddress?: string;

  @ApiProperty({
    description: 'User agent string from the browser/device',
    example: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)'
  })
  @IsString()
  @IsOptional()
  userAgent?: string;

  @ApiProperty({
    description: 'Device model or type',
    example: 'iPhone 14'
  })
  @IsString()
  @IsOptional()
  device?: string;

  @ApiPropertyOptional({
    description: 'Device type classification - MOBILE, TABLET, DESKTOP, BOT, or UNKNOWN',
    example: 'MOBILE',
    enum: ['MOBILE', 'TABLET', 'DESKTOP', 'BOT', 'UNKNOWN']
  })
  @IsOptional()
  @IsIn(['MOBILE', 'TABLET', 'DESKTOP', 'BOT', 'UNKNOWN'])
  deviceType?: 'MOBILE' | 'TABLET' | 'DESKTOP' | 'BOT' | 'UNKNOWN';

  @ApiProperty({
    description: 'Operating system of the device',
    example: 'iOS'
  })
  @IsString()
  @IsOptional()
  os?: string;

  @ApiPropertyOptional({
    description: 'Operating system version',
    example: '16.4.1'
  })
  @IsOptional()
  @IsString()
  osVersion?: string;

  @ApiPropertyOptional({
    description: 'Browser name',
    example: 'Chrome'
  })
  @IsOptional()
  @IsString()
  browser?: string;

  @ApiPropertyOptional({
    description: 'Browser version',
    example: '120.0.0'
  })
  @IsOptional()
  @IsString()
  browserVersion?: string;

  @ApiPropertyOptional({
    description: 'Whether the client is a bot/crawler (kept for explicit filtering)',
    example: false
  })
  @IsOptional()
  @IsBoolean()
  isBot?: boolean;

  // ========== MISSING PROPERTIES TO ADD ==========

  @ApiPropertyOptional({
    description: 'Whether the client is a mobile device',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  isMobile?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the client is a tablet device',
    example: false
  })
  @IsOptional()
  @IsBoolean()
  isTablet?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the client is a desktop device',
    example: false
  })
  @IsOptional()
  @IsBoolean()
  isDesktop?: boolean;
}