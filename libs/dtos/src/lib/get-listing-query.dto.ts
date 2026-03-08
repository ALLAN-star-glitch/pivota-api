import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';


export class GetListingQueryDto {
  @ApiPropertyOptional({
    description: 'Search session ID - links this view to a search session',
    example: 'search_abc123'
  })
  @IsOptional()
  @IsString()
  searchId?: string;

  @ApiPropertyOptional({
    description: 'Position in search results (1-based) - for CTR analysis',
    example: '3'
  })
  @IsOptional()
  @IsString()
  pos?: string;

  @ApiPropertyOptional({
    description: 'Original search query - for search relevance',
    example: '2 bedroom apartment kilimani'
  })
  @IsOptional()
  @IsString()
  q?: string;

  // ADD THESE NEW PROPERTIES
  @ApiPropertyOptional({
    description: 'Time spent viewing in seconds - for engagement scoring',
    example: '45'
  })
  @IsOptional()
  @IsString()
  timeSpent?: string;

  @ApiPropertyOptional({
    description: 'Type of user interaction - for behavior analysis',
    example: 'SCROLL',
    enum: ['CLICK', 'SCROLL', 'DWELL']
  })
  @IsOptional()
  @IsString()
  @IsIn(['CLICK', 'SCROLL', 'DWELL'])
  interactionType?: string;

  @ApiPropertyOptional({
    description: 'How far the user scrolled (percentage) - for content engagement',
    example: '75'
  })
  @IsOptional()
  @IsString()
  scrollDepth?: string;
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