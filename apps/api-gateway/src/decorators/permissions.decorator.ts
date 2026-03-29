// libs/decorators/src/lib/permissions.decorator.ts

import { SetMetadata } from '@nestjs/common';
import { Permission } from '@pivota-api/access-management';

// This must match the key used in your PermissionsGuard
export const PERMISSIONS_KEY = 'permissions'; 

/**
 * Decorator to set required permissions for a route handler or controller.
 * Uses permission constants from the shared access-management library.
 * 
 * @example
 * @Permissions(Permissions.HOUSING_CREATE_OWN)
 * @Permissions(Permissions.EMPLOYMENT_APPLY, Permissions.PROFESSIONAL_SERVICES_BOOK)
 */
export const Permissions = (...permissions: Permission[]) => 
  SetMetadata(PERMISSIONS_KEY, permissions);