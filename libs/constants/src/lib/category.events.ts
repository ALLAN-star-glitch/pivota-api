

export const CategoryEvents = {
  CREATED: 'category.created',
  UPDATED: 'category.updated',
  DELETED: 'category.deleted',
  BULK_SYNC: 'category.bulk_sync'
} as const;

export interface CategoryEventData {
  id: string;
  name: string;
  slug: string;
  vertical: string;
  type: string;
  description?: string;
  parentId?: string;
  hasSubcategories: boolean;
  hasParent: boolean;
  version: number;
  isActive?: boolean;
}

export interface CategoryEvent {
  eventId: string;
  timestamp: string;
  source: 'listings-service';
  data: CategoryEventData;
}