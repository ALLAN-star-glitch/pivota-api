// Session DTO - matches your database schema
export class SessionDto {
  id!: string;
  tokenId!: string;
  
  // Client info fields
  device?: string;
  deviceType?: 'MOBILE' | 'TABLET' | 'DESKTOP' | 'BOT' | 'UNKNOWN';
  os?: string;
  osVersion?: string;
  browser?: string;
  browserVersion?: string;
  ipAddress?: string;
  userAgent?: string;
  isMobile?: boolean;
  isTablet?: boolean;
  isDesktop?: boolean;
  isBot?: boolean;
  
  // Session metadata
  createdAt!: string;
  expiresAt!: string;
  revoked!: boolean;
}