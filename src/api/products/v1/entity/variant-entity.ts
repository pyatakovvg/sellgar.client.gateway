import { VariantImageEntity } from './variant-image-entity';
import { ProductFieldEntity } from './product-field-entity';
export interface VariantEntity {
  uuid: string;
  name: string;
  description: string | null;
  status: 'active' | 'archived';
  properties: ProductFieldEntity[];
  images: VariantImageEntity[];
}
