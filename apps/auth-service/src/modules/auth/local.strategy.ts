// import { Strategy } from 'passport-local';
// import { PassportStrategy } from '@nestjs/passport';
// import { Injectable, UnauthorizedException } from '@nestjs/common';
// import { AuthService } from './auth.service';
// import { AuthUserDto } from '@pivota-api/dtos';

// @Injectable()
// export class LocalStrategy extends PassportStrategy(Strategy) {
//   constructor(private authService: AuthService) {
//     // Tell passport-local to expect "email" instead of "username"
//     super({ usernameField: 'email' });
//   }

//   async validate(email: string, password: string): Promise<AuthUserDto> {
//     const user = await this.authService.validateUser(email, password);
//     if (!user) {
//       throw new UnauthorizedException('Invalid email or password');
//     }
//     return user; // attaches to req.user
//   }
// }
