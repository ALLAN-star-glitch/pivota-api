// In your DTOs
export class SignupResponseDto {
  // Common fields
  message: string | undefined;
  
  // For successful signup (free plan)
  accessToken?: string;
  refreshToken?: string;
  redirectTo?: string;
  
  // For payment required response
  redirectUrl?: string;
  merchantReference?: string;
}