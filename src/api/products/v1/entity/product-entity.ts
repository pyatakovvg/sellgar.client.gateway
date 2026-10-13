import { VariantEntity } from './variant-entity';
import { ProductFieldEntity } from './product-field-entity';
export interface ProductEntity {
  uuid: string;
  typeUuid: string;
  typeVersion: number;
  version: number;
  name: string;
  description: string | null;
  status: 'active' | 'archived';
  brandCode: string;
  properties: ProductFieldEntity[];
  variants: VariantEntity[];
}
