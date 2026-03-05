import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GetListingQueryDto {
  @ApiPropertyOptional({ description: 'Search session ID', example: 'search_123' })
  @IsOptional()
  @IsString()
  searchId?: string;

  @ApiPropertyOptional({ description: 'Position in search results', example: '3' })
  @IsOptional()
  @IsString()
  pos?: string;

  @ApiPropertyOptional({ description: 'Search query', example: '2 bedroom apartment' })
  @IsOptional()
  @IsString()
  q?: string;
}

export class GetListingHeadersDto {
  @ApiPropertyOptional({ description: 'Referrer URL', example: 'https://pivota.com/search' })
  @IsOptional()
  @IsString()
  referer?: string;

  @ApiPropertyOptional({ description: 'Platform', example: 'WEB', enum: ['WEB', 'MOBILE', 'API'] })
  @IsOptional()
  @IsString()
  'x-platform'?: string;
}