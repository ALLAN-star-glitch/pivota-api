import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsDate, IsNotEmpty } from 'class-validator';

export class CloseJobPostResponseDto {
  @ApiProperty({
        example: 'clv1234567890',
        description: 'The unique identifier of the job post'
    })
    @IsString()
    @IsNotEmpty()
    id!: string;

  @ApiProperty({
        example: 'CLOSED',
        description: 'The updated status of the job'
    })
    @IsString()
    @IsNotEmpty()
    status!: string;

  @ApiProperty({
        example: true,
        description: 'Boolean flag confirming the job is in a closed state'
    })
    @IsBoolean()
    isClosed!: boolean;

  @ApiProperty({
        example: '2025-12-30T20:36:50.000Z',
        description: 'The timestamp when the job was closed (matches updatedAt)'
    })
    @IsDate()
    closedAt!: Date;
}