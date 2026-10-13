import { CurrencyEntity } from './currency-entity';
export interface PriceHistoryEntity {
  uuid: string;
  value: string;
  currencyCode: string;
  currency?: CurrencyEntity;
}
