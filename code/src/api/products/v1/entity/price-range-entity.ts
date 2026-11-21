import { CurrencyEntity } from './currency-entity';

export interface PriceRangeEntity {
  min: string;
  max: string;
  currencyCode: string;
  currency?: CurrencyEntity;
}
