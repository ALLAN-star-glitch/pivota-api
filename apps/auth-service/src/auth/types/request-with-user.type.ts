// src/auth/types/request-with-user.ts
import { Request } from 'express';
import { JwtPayload } from '../jwt.strategy';

export type RequestWithUser = Request & { user: JwtPayload };
