import { ApiProperty } from "@nestjs/swagger";

// Create a simple response DTO
export class SignupResponseDto {
  @ApiProperty({ example: 'Signup successful' })
    message!: string;
}

