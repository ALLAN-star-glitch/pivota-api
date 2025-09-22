/* eslint-disable @typescript-eslint/no-unused-vars */
import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserResponseDto } from '@pivota-api/dtos';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  handleRequest<TUser = UserResponseDto>(
    err: unknown,
    user: TUser | false,
    info?: { message: string },
    _context?: ExecutionContext,
    _status?: unknown,
  ): TUser {
    if (err) {
      throw err;
    }
    if (!user) {
      throw new Error(info?.message ?? 'Invalid credentials');
    }
    return user;
  }
}
