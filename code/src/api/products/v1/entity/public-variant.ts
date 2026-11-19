import { ProductFieldEntity } from './product-field-entity';
import { PublicVariantImage } from './public-variant-image';
export interface PublicVariant {
  uuid: string;
  name: string;
  description: string | null;
  properties: ProductFieldEntity[];
  images: PublicVariantImage[];
}
