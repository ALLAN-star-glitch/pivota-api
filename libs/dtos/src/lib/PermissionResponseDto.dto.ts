export class PermissionResponseDto {
  id!: number;
  action!: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}