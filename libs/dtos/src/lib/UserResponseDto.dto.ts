export class UserResponseDto {
  id!: string;           // string for API, cast from Prisma number
  email!: string;
  firstName!: string;
  lastName!: string;
  phone?: string;
  createdAt!: string;
  updatedAt!: string;
}
