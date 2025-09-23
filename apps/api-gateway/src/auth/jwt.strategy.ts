import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '@pivota-api/interfaces';
import { AuthService } from './auth.service';



@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {

  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => req?.cookies?.access_token,
      ]),
      secretOrKey: process.env.JWT_SECRET,
    });
    this.logger.log('🔐 JWT Strategy initialized');
    this.logger.log(`JWT Secret: ${process.env.JWT_SECRET ? '***' : 'Not Set'}`);
  }

  async validate(payload: JwtPayload) {
    const user = await this.authService.getUserFromPayload(payload);
    if (!user) return null;
    return user; // attached to req.user
  }
}
