export class CreateCategoryResponseDto {
  id!: string;
  name!: string;
  description?: string | null;
  parentId?: string | null;
  categoryType!: 'INFORMAL' | 'FORMAL';
  informalJobsCount!: number;    
  formalJobsCount!: number;       
  providerJobsCount!: number;      
  subcategoriesCount!: number;     
  hasSubcategories!: boolean;      
  subcategories?: CreateCategoryResponseDto[]; 
  hasParent!: boolean;               
  createdAt!: string;
  updatedAt!: string;
}
