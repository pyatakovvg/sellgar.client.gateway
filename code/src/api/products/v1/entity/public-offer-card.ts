import { AccountingRecordEntity } from './accounting-record-entity';
import { PriceHistoryEntity } from './price-history-entity';
import { BrandEntity } from './brand-entity';
import { PublicProductSummary } from './public-product-summary';
import { PublicVariant } from './public-variant';
export interface PublicOfferCard {
  uuid: string;
  offerUuid: string;
  storeProductUuid: string;
  productUuid: string;
  variantUuid: string;
  name: string;
  description: string | null;
  product: PublicProductSummary;
  brand: BrandEntity | null;
  variant: PublicVariant;
  records: AccountingRecordEntity[];
  currentPrice: PriceHistoryEntity | null;
  createdAt: string;
  updatedAt: string;
}
