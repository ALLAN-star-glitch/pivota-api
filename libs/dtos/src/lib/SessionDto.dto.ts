//Representation of a user session (refresh token session)
// Your SessionDto is just a TypeScript representation of one RefreshToken row, cleaned up for API
// Representation of a user session (refresh token session)
export class SessionDto {
  id!: number;
  tokenId!: string;
  device?: string;
  os?: string; 
  ipAddress?: string;
  userAgent?: string;
  createdAt!: string;
  expiresAt!: string;
  revoked!: boolean;
}
