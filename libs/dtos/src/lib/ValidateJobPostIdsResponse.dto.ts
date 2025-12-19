import { ApiProperty } from '@nestjs/swagger';

export class ValidateJobPostIdsReponseDto {
  @ApiProperty({
    description: 'Array of valid Job Post IDs',
    type: [String],
    example: ['jobId1', 'jobId2'],
  })
  validIds!: string[];

  @ApiProperty({
    description: 'Array of invalid Job Post IDs that do not exist in the system',
    type: [String],
    example: ['jobId3', 'jobId4'],
  })
  invalidIds!: string[];
}
