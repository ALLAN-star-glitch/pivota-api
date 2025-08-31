//Purpose: Protect routes after login so only requests with a valid JWT can access them.

//How it works: Extends Nest’s AuthGuard('jwt'), which calls your JwtStrategy.validate() method automatically.

//Think of it as a gate keeper for the protected resources

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
