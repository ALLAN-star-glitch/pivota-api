// housing-training-data.params.ts
// This file contains internal parameter interfaces for the service layer
// No validation decorators needed here as they're for internal use

export interface TrainingDataParams {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  includeLabels?: boolean;
  onlyLabeled?: boolean;
  excludeBots?: boolean;
  userIds?: string[];
  minDwellTime?: number;
  includeFeatureImportance?: boolean;
  minOverallMatchScore?: number;
  listingTypes?: string[];
  propertyTypes?: string[];
}

export interface FeatureSchema {
  type: 'numeric' | 'categorical' | 'boolean' | 'datetime';
  description: string;
}

export interface LabelSchema {
  type: 'binary' | 'continuous' | 'multiclass';
  description: string;
}