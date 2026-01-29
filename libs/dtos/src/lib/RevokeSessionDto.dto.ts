import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class RevokeSessionDto {
  @ApiPropertyOptional({ 
    example: '550e8400-e29b-41d4-a716-446655440000', 
    description: 'The UUID of the user. Only required if an Admin is revoking someone else\'s session.' 
  })
  @IsUUID()
  @IsOptional()
  userUuid?: string;

  @ApiPropertyOptional({ 
    example: 'user-uuid-1715856000', 
    description: 'The specific session ID (tokenId) to revoke. If omitted, ALL sessions for the user will be invalidated (Global Logout).' 
  })
  @IsString()
  @IsOptional()
  tokenId?: string;
}