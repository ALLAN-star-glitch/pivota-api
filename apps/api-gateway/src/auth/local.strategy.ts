import { Injectable, UnauthorizedException, OnModuleInit, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { ClientGrpc } from '@nestjs/microservices';
import { lastValueFrom, Observable } from 'rxjs';
import { UserResponseDto } from '@pivota-api/dtos';

// Define gRPC interface (from your proto)
export interface AuthServiceGrpc {
  validateUser(data: { email: string; password: string }):  Observable<UserResponseDto | null>; // returns Observable<User>
}

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) implements OnModuleInit {
  private authServiceGrpc: AuthServiceGrpc;
  private getGrpcService(): AuthServiceGrpc {
    if (!this.authServiceGrpc){
        this.authServiceGrpc = this.grpcClient.getService<AuthServiceGrpc>('AuthService');
    }
    return this.authServiceGrpc;
  }

  constructor(  @Inject('AUTH_PACKAGE') private grpcClient: ClientGrpc) {
    super({ usernameField: 'email' });
  }

  onModuleInit() {

    // Initialize gRPC service
    this.authServiceGrpc = this.grpcClient.getService<AuthServiceGrpc>('AuthService');
  }

  async validate(email: string, password: string) {
    const grpcService = this.getGrpcService();
    try {
      // Call AuthService via gRPC
      const user$ = grpcService.validateUser({ email, password }); 
      const user = await lastValueFrom(user$); // convert Observable to Promise
      if (!user) throw new UnauthorizedException('Invalid credentials');
      return user; // attached to req.user
    } catch (err) {
      throw new UnauthorizedException('Invalid credentials', err);
    }
  }
}
