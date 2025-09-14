import { UserResponseDto } from "./UserResponseDto.dto";

// For internal auth logic
export class AuthUserDto extends UserResponseDto {
  password!: string; // 🔹 only used in AuthService, not returned to clients
}