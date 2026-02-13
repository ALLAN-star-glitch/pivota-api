import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '@pivota-api/interfaces';
import { AuthService } from './auth.service';
import { Request } from 'express';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private readonly authService: AuthService) {
    // Load .env.dev or .env first
    let jwtSecret = '';
    if (fs.existsSync('.env.dev')) {
      dotenv.config({ path: '.env.dev' });
      console.log('✅ Loaded environment variables from .env.dev');
    } else if (fs.existsSync('.env')) {
      dotenv.config({ path: '.env' });
      console.log('✅ Loaded environment variables from .env');
    } else {
      console.warn('⚠️  No .env file found. JWT_SECRET may be missing!');
    }

    jwtSecret = process.env.JWT_SECRET || '';

    // Call super() first with the secret
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.access_token,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => req?.query?.token as string,
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });

    // Now you can use this.*
    this.logger.log('🔐 JWT Strategy initialized');
    if (!jwtSecret) {
      this.logger.error(
        '❌ JWT_SECRET is not defined — tokens will fail to validate',
      );
    }
  }

  /**
   * Validates incoming JWT payload.
   * Throws UnauthorizedException if user is not found.
   */
  async validate(payload: JwtPayload) {
    this.logger.debug(`Validating JWT payload for ${payload.email}`);

    const user = await this.authService.getUserFromPayload(payload);
    if (!user) {
      this.logger.warn(
        `❌ JWT validation failed: user not found for ${payload.email}`,
      );
      throw new UnauthorizedException('Invalid or expired token');
    }

    this.logger.debug(
      `✅ Authenticated user ${user.email} (UUID: ${payload.userUuid}) with role: ${payload.role}`,
    );

    // Return full enriched user object
    return {
      ...user,
      userUuid: payload.userUuid,
      email: payload.email,
      role: payload.role,
      planSlug: payload.planSlug,
      accountId: payload.accountId,
      userName: payload.userName,
      accountName: payload.accountName,
      accountType: payload.accountType,
    };
  }
}
