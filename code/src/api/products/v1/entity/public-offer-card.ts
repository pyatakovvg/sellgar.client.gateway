import { AccountingRecordEntity } from './accounting-record-entity';
import { PriceRangeEntity } from './price-range-entity';
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
  priceRange: PriceRangeEntity | null;
  createdAt: string;
  updatedAt: string;
}
