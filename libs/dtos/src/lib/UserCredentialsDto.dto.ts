import { SessionDto } from "./SessionDto.dto";

export class UserCredentialsDto {
  id!: string;
  email!: string;
  password!: string; // hashed
  refreshTokens?: SessionDto[];
}