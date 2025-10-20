import { Request } from 'express';
import { AuthUserDto } from '@pivota-api/dtos';

export interface AuthenticatedRequest extends Request {
  user: AuthUserDto;
}
