// api-gateway/src/modules/auth/jwt.strategy.ts
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '@pivota-api/interfaces';
import { Request } from 'express';
import { AuthenticationGatewayService } from './authentication-gateway.service';


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
  skilledProfessionalProfile?: {
    uuid: string;
  };
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly authenticationService: AuthenticationGatewayService,
  ) {
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

    const response = await this.authenticationService.getUserFromPayload(payload) as unknown as AuthServiceUserResponse;

    if (!response || !response.user) {
      this.logger.warn(`❌ JWT validation failed: user not found for ${payload.email}`);
      throw new UnauthorizedException('Invalid or expired token');
    }

    const dbUser = response.user;
    const dbAccount = response.account;
    const dbOrganization = response.organization;
    const dbProfessionalProfile = response.skilledProfessionalProfile;

    this.logger.debug(
      `✅ Authenticated user (${dbUser.firstName} ${dbUser.lastName}) ${dbUser.email} (UUID: ${payload.sub}) with role: ${dbUser.roleName}`,
    );

    if (dbProfessionalProfile?.uuid) {
      this.logger.debug(`✅ User has professional profile: ${dbProfessionalProfile.uuid}`);
    }

    const rawRole = payload.role || dbUser.roleName;
    const normalizedRole = rawRole.replace(/\s+/g, '');

    return { 
      sub: payload.sub,
      userUuid: payload.sub,
      email: payload.email,
      role: normalizedRole,
      accountId: payload.accountId,
      tokenId: payload.jti,
      professionalId: payload.professionalId || dbProfessionalProfile?.uuid,
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