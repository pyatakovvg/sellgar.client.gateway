import { ProductFieldEntity } from './product-field-entity';
export interface PublicProductSummary {
  uuid: string;
  name: string;
  description: string | null;
  properties: ProductFieldEntity[];
}
