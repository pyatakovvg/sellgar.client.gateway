import { AccountingRecordEntity } from './accounting-record-entity';
import { PriceRangeEntity } from './price-range-entity';
export interface StoreOfferEntity {
  uuid: string;
  storeProductUuid: string;
  shopUuid: string;
  productUuid: string;
  variantUuid: string;
  status: string;
  showing: boolean;
  records: AccountingRecordEntity[];
  priceRange: PriceRangeEntity | null;
  createdAt: string;
  updatedAt: string;
}
