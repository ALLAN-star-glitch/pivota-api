import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '@pivota-api/interfaces';
import { AuthService } from './auth.service';
import { Request } from 'express';

interface AuthServiceUserResponse {
  account: {
    uuid: string;
    accountCode: string;
    type: string;
    name?: string;
  };
  user: {
    uuid: string;
    firstName: string;
    lastName: string;
    email: string;
    roleName: string;
    status: string;
  };
  organization?: {
    uuid: string;
    name: string;
  };
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.access_token,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => req?.query?.token as string,
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });

    this.logger.log('🔐 JWT Strategy initialized');
    if (!process.env.JWT_SECRET) {
      this.logger.error('❌ JWT_SECRET is not defined — tokens will fail to validate');
    }
  }
  
  async validate(payload: JwtPayload) {
    this.logger.debug(`Validating JWT payload for ${payload.email}`);

    // Get full user data from Auth Service (which fetches from cache/Profile Service)
    const response = await this.authService.getUserFromPayload(payload) as unknown as AuthServiceUserResponse;

    if (!response || !response.user) {
      this.logger.warn(`❌ JWT validation failed: user not found for ${payload.email}`);
      throw new UnauthorizedException('Invalid or expired token');
    }

    const dbUser = response.user;
    const dbAccount = response.account;
    const dbOrganization = response.organization;

    this.logger.debug(
      `✅ Authenticated user (${dbUser.firstName} ${dbUser.lastName}) ${dbUser.email} (UUID: ${payload.sub}) with role: ${dbUser.roleName}`,
    );

    const rawRole = payload.role || dbUser.roleName;
    const normalizedRole = rawRole.replace(/\s+/g, '');

    // Return enriched user object with data from database/cache
    return { 
      // Core identity (from JWT)
      sub: payload.sub,
      userUuid: payload.sub,
      email: payload.email,
      role: normalizedRole,
      accountId: payload.accountId,
      tokenId: payload.jti,
      
      // Enriched data (from database/cache)
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      userName: `${dbUser.firstName} ${dbUser.lastName}`,
      accountName: dbAccount?.name || '',
      accountType: dbAccount?.type || payload.accountType,
      organizationUuid: dbOrganization?.uuid,
      planSlug: payload.planSlug,
      status: dbUser.status,
    };
  }
}