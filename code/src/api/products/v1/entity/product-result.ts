import { ProductEntity } from './product-entity';
export interface ProductResult {
  items: ProductEntity[];
  total: number;
  limit: number;
  offset: number;
}
