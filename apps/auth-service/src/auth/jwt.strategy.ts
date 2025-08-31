// src/auth/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { jwtConstants } from './constants';

export interface JwtPayload {
  sub: number;          // user ID
  email: string;
  role: string;         // e.g. 'user', 'admin'
  plan: string;         // e.g. 'free', 'premium'
  planExpiry?: number;  // Unix timestamp
  isActive?: boolean;
}


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
    });
  }

  async validate(payload: JwtPayload) {
  return {
    userId: payload.sub,
    email: payload.email,
    role: payload.role,
    plan: payload.plan,
    planExpiry: payload.planExpiry,
    isActive: payload.isActive,
  };
}

}
