import { SetMetadata } from '@nestjs/common';

// This must match the key used in your RolesGuard
export const PERMISSIONS_KEY = 'permissions'; 

export const Permissions = (...permissions: string[]) => 
  SetMetadata(PERMISSIONS_KEY, permissions);