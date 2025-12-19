import { ApiProperty } from '@nestjs/swagger';

export class UserBasicDto {
  @ApiProperty({
    description: 'Unique UUID of the user',
    example: 'user_cuid_abc456',
  })
  id!: string;

  @ApiProperty({
    description: 'Full name of the user',
    example: 'Allan Mathenge',
  })
  fullName!: string;

  @ApiProperty({
    description: 'Email address of the user',
    example: 'allan@example.com',
    required: false,
    nullable: true,
  })
  email?: string;

  @ApiProperty({
    description: 'Phone number of the user',
    example: '+254740900111',
    required: false,
    nullable: true,
  })
  phone?: string;
}
