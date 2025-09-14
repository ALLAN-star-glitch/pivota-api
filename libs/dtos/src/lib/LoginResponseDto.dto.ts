export class LoginResponseDto {
  id!: string;
  email!: string;
  firstName!: string;
  lastName!: string;
  phone?: string;
  createdAt!: Date;
  updatedAt!: Date;
  accessToken!: string;
  refreshToken!: string;
}