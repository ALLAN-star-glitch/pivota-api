import { IsString, IsOptional, IsNotEmpty } from "class-validator";

export class AssignRoleToUserRequestDto {
  
  @IsString()
  @IsNotEmpty()
  roleType!: string; 
  
  @IsString()
  @IsOptional()
  assignedBy?: string;
  
  @IsString()
  @IsOptional()
  reason?: string;
}