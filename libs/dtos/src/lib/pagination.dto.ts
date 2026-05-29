import { ApiProperty } from "@nestjs/swagger";

/**
 * Pagination information for list responses
 */
export class PaginationDto {
  @ApiProperty({
        description: 'Total number of items available',
        example: 245,
    })
    total!: number;

  @ApiProperty({
        description: 'Number of items per page',
        example: 20,
    })
    limit!: number;

  @ApiProperty({
        description: 'Number of items skipped',
        example: 0,
    })
    offset!: number;

  @ApiProperty({
        description: 'Whether there are more items available',
        example: true,
    })
    hasMore!: boolean;
}