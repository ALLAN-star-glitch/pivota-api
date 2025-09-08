export class LoginResponseDto {
  id!: string;
  email!: string;
  firstName!: string;
  lastName!: string;
  phone?: string;
  createdAt!: Date;
  updatedAt!: Date;
  access_token!: string;
  refresh_token!: string;
}