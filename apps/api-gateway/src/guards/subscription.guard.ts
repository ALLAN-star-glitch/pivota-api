// import {
//   Injectable,
//   CanActivate,
//   ExecutionContext,
//   ForbiddenException,
//   UnauthorizedException,
//   Logger,
// } from '@nestjs/common';
// import { SubscriptionService } from './subscription.service';

// @Injectable()
// export class SubscriptionGuard implements CanActivate {
//   private readonly logger = new Logger(SubscriptionGuard.name);

//   constructor(private readonly subscriptionService: SubscriptionService) {}


//   async canActivate(context: ExecutionContext): Promise<boolean> {
//     const req = this.getRequest(context);
//     const user = req.user;

//     if (!user) throw new UnauthorizedException('User not authenticated');

//     // SYSTEM roles bypass subscription checks
//     if (user.scope === 'SYSTEM') return true;

//     const moduleSlug = this.getModuleSlug(context);
//     if (!moduleSlug) throw new ForbiddenException('Module slug missing');

//     // Fetch module rules via gRPC call
//     const moduleRules = await this.subscriptionService.getModuleRules(user.userUuid, moduleSlug);

//     // Attach to request for service-level enforcement
//     req.subscriptionModuleRules = moduleRules;

//     this.logger.debug(
//       `User ${user.userUuid} subscription rules for module "${moduleSlug}": ${JSON.stringify(
//         moduleRules,
//       )}`,
//     );

//     return true;
//   }

//   private getRequest(context: ExecutionContext) {
//     if (context.getType() === 'http') return context.switchToHttp().getRequest();
//     if (context.getType() === 'rpc') return context.switchToRpc().getData();
//     if (context.getType() === 'ws') return context.switchToWs().getClient();
//     return null;
//   }

//   private getModuleSlug(context: ExecutionContext): string {
//     const req = this.getRequest(context);
//     return req?.params?.moduleSlug ?? req?.body?.moduleSlug ?? null;
//   }
// }
