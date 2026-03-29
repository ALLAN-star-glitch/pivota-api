// libs/decorators/src/lib/set-module.decorator.ts

import { SetMetadata } from '@nestjs/common';
import { ModuleSlug } from '@pivota-api/access-management';

/**
 * Key used by SubscriptionGuard to identify which module this route belongs to
 */
export const MODULE_KEY = 'module';

/**
 * Attach a module slug to a controller or route handler
 * so SubscriptionGuard can enforce plan/module restrictions.
 * Uses module slugs from the shared access-management library.
 * 
 * @example
 * @SetModule(ModuleSlug.HOUSING)
 * @SetModule(ModuleSlug.EMPLOYMENT)
 * @SetModule(ModuleSlug.PROFESSIONAL_SERVICES)
 */
export const SetModule = (moduleSlug: ModuleSlug) => SetMetadata(MODULE_KEY, moduleSlug);