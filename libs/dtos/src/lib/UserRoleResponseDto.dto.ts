export class UserRoleResponseDto {
  id!: number;
  userUuid!: string; 
  roleId!: number;
  name!: string;
  roleType!: string;
  scope!: string;
  description!: string;
  status!: string;
  createdAt!: Date;
  updatedAt!: Date;
}
