import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsISO8601 } from "class-validator";

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

  @ApiProperty({ example: 'iPhone 15' })
  @IsString()
  @IsNotEmpty()
  device!: string;

  @ApiProperty({ example: 'iOS 17.2' })
  @IsString()
  @IsNotEmpty()
  os!: string;

  @ApiProperty({ example: 'Safari' })
  @IsString()
  @IsNotEmpty()
  userAgent!: string;

  @ApiProperty({ example: '192.168.1.1' })
  @IsString()
  @IsNotEmpty()
  ipAddress!: string;

  @ApiProperty({ example: '2026-01-08T14:00:00Z' })
  @IsISO8601() // Validates that it's a proper ISO date string
  @IsNotEmpty()
  timestamp!: string;

  @ApiPropertyOptional({ example: 'Pivota Tech Ltd' })
  @IsOptional()
  @IsString()
  organizationName?: string; 

  @ApiPropertyOptional({ example: 'admin@pivotatech.com' })
  @IsOptional()
  @IsEmail()
  orgEmail?: string; 
}
