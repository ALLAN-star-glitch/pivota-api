export class SyncUserRoleRequestDto {
  userUuid!: string;
  roleName!: string;
  roleType!: string;
  scope!: string
}

export class SyncUserRoleResponseDto {
  success!: boolean;
  message!: string;
}