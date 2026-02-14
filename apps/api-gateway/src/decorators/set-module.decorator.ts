import { SetMetadata } from '@nestjs/common';

/**
 * Key used by SubscriptionGuard to identify which module this route belongs to
 */
export const MODULE_KEY = 'module';

/**
 * Attach a module slug to a controller or route handler
 * so SubscriptionGuard can enforce plan/module restrictions
 */
export const SetModule = (moduleSlug: string) => SetMetadata(MODULE_KEY, moduleSlug);

