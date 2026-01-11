import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '@pivota-api/interfaces';
import { AuthService } from './auth.service';
import { Request } from 'express';

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

  const user = await this.authService.getUserFromPayload(payload);
  if (!user) {
    this.logger.warn(`❌ JWT validation failed: user not found for ${payload.email}`);
    throw new UnauthorizedException('Invalid or expired token');
  }

  this.logger.debug(
    ` Authenticated user ${user.email} (UUID: ${payload.userUuid}) with role: ${payload.role}`,
  );

  // RETURN THE FULL OBJECT
  return {
    ...user,
    userUuid: payload.userUuid,
    email: payload.email,
    role: payload.role,
    planSlug: payload.planSlug,
    accountId: payload.accountId,
    // ADD THESE THREE LINES:
    userName: payload.userName,       
    accountName: payload.accountName, 
    accountType: payload.accountType,
  };
}
}
