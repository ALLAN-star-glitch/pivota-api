//Representation of a user session (refresh token session)

export class SessionDto {
  id!: number;
  tokenId!: string;
  device?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt!: Date;
  expiresAt!: Date;
  revoked!: boolean;
}