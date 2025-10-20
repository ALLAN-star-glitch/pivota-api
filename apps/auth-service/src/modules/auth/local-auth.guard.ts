// apps/auth-service/src/auth/guards/local-auth.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  getRequest(context: ExecutionContext) {
    const data = context.switchToRpc().getData(); // Kafka payload
    return { body: data }; // mimic HTTP req.body
  }
}
