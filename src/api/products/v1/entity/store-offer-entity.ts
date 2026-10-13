import { AccountingRecordEntity } from './accounting-record-entity';
import { PriceHistoryEntity } from './price-history-entity';
export interface StoreOfferEntity {
  uuid: string;
  storeProductUuid: string;
  shopUuid: string;
  productUuid: string;
  variantUuid: string;
  status: string;
  showing: boolean;
  records: AccountingRecordEntity[];
  currentPrice?: PriceHistoryEntity | null;
  createdAt: string;
  updatedAt: string;
}
