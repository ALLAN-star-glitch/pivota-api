import { UserResponseDto } from "./UserResponseDto.dto";

export class LoginResponseDto extends UserResponseDto{
  accessToken!: string;
  refreshToken!: string;
}