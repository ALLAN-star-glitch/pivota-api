// libs/interfaces/src/lib/jwt-payload.interface.ts
export interface JwtPayload {
  // Standard JWT claims
  sub: string;        // userUuid
  jti: string;        // tokenId
  iat: number;        // issued at
  
  // Custom claims
  email: string;
  accountId: string;
  role: string;
  accountType: 'INDIVIDUAL' | 'ORGANIZATION';
  organizationUuid?: string;
  planSlug?: string;
}