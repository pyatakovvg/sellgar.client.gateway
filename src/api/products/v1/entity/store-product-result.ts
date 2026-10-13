import { Meta } from './meta';
import { StoreProductEntity } from './store-product-entity';
export interface StoreProductResult {
  data: StoreProductEntity[];
  meta: Meta;
}
