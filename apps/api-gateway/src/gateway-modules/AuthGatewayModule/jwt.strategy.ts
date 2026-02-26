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
  organization?: {  // ← Add this if it exists in the response
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

    // 1. Get the response and cast to 'any' to avoid the DTO property error
    const response = await this.authService.getUserFromPayload(payload) as unknown as AuthServiceUserResponse;

    if (!response || !response.user) {
      this.logger.warn(`❌ JWT validation failed: user not found for ${payload.email}`);
      throw new UnauthorizedException('Invalid or expired token');
    }

    // 2. Safely extract the nested objects
    const dbUser = response.user;
    const dbAccount = response.account;
    const dbOrganization = response.organization;

    // Now these won't be undefined in your logs!
    this.logger.debug(
      `✅ Authenticated user (${dbUser.firstName} ${dbUser.lastName}) ${dbUser.email} (UUID: ${payload.userUuid}) with role: ${dbUser.roleName}`,
    );

    const rawRole = dbUser.roleName || payload.role;

    // Remove spaces to turn "General User" into "GeneralUser" 
    // so it matches your RolePermissionsMap keys.
    const normalizedRole = rawRole.replace(/\s+/g, '');

    // 3. Return the flat object your Guards and Controllers expect
    return {
      ...dbUser, // Spreads firstName, lastName, etc.
      userUuid: payload.userUuid,
      email: dbUser.email || payload.email,
      
      // Use the role name from the database (e.g., "SuperAdmin" or "General User")
      role: normalizedRole, 
      
      // Fixes your 'Account: undefined' bug in the controller
      accountId: dbAccount?.uuid || payload.accountId,
      
      organizationUuid: dbOrganization?.uuid || payload.organizationUuid,
      
      userName: `${dbUser.firstName} ${dbUser.lastName}`,       
      accountName: dbAccount?.name || payload.accountName, 
      accountType: dbAccount?.type || payload.accountType,
      planSlug: payload.planSlug,
    };
  }
}
