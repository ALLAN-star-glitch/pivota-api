// LoginResponseDto.dto.ts
export class LoginResponseDto {
  // Stage 1: MFA required
  email?: string;
  uuid?: string;
  message?: string;  // "MFA_REQUIRED"
  
  // Stage 2: Tokens
  accessToken?: string;
  refreshToken?: string;
}