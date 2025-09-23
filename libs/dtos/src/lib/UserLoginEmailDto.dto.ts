// user-login-email.dto.ts
export class UserLoginEmailDto {
  to!: string;
  firstName!: string;
  device!: string;
  ipAddress!: string;
  userAgent!: string;
  os!: string;
  timestamp!: string;
  subject?: string;
}