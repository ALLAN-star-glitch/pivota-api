import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '@pivota-api/interfaces';
import { AuthService } from './auth.service';
import { Request } from 'express';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

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
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private readonly authService: AuthService) {
    // Load environment variables (.env.dev first, fallback to .env)
    if (fs.existsSync('.env.dev')) {
      dotenv.config({ path: '.env.dev' });
      console.log('✅ Loaded environment variables from .env.dev');
    } else if (fs.existsSync('.env')) {
      dotenv.config({ path: '.env' });
      console.log('✅ Loaded environment variables from .env');
    } else {
      console.warn('⚠️  No .env file found. JWT_SECRET may be missing!');
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error(
        '❌ JWT_SECRET is missing. Define it in your .env or .env.dev file',
      );
    }

    // Initialize Passport JWT strategy
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.access_token,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => req?.query?.token as string,
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });

    this.logger.log('🔐 JWT Strategy initialized');
  }

  /**
   * Validates incoming JWT payload.
   * Enriches user info from AuthService and normalizes role.
   */
  async validate(payload: JwtPayload) {
    this.logger.debug(`Validating JWT payload for ${payload.email}`);

    // Fetch full user + account info from AuthService
    const response = (await this.authService.getUserFromPayload(
      payload,
    )) as unknown as AuthServiceUserResponse;

    if (!response || !response.user) {
      this.logger.warn(
        `❌ JWT validation failed: user not found for ${payload.email}`,
      );
      throw new UnauthorizedException('Invalid or expired token');
    }

    const dbUser = response.user;
    const dbAccount = response.account;

    // Normalize role (remove spaces for RolePermissionsMap keys)
    const rawRole = dbUser.roleName || payload.role || 'User';
    const normalizedRole = rawRole.replace(/\s+/g, '');

    this.logger.debug(
      `✅ Authenticated user (${dbUser.firstName} ${dbUser.lastName}) ${dbUser.email} (UUID: ${payload.userUuid}) with role: ${normalizedRole}`,
    );

    // Return fully enriched, flat object for Guards/Controllers
    return {
      ...dbUser,
      userUuid: payload.userUuid,
      email: dbUser.email || payload.email,
      role: normalizedRole,
      accountId: dbAccount?.uuid || payload.accountId,
      userName: `${dbUser.firstName} ${dbUser.lastName}`,
      accountName: dbAccount?.name || payload.accountName,
      accountType: dbAccount?.type || payload.accountType,
      planSlug: payload.planSlug,
    };
  }
}
