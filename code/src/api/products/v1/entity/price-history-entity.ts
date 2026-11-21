import { CurrencyEntity } from './currency-entity';
export interface PriceHistoryEntity {
  uuid: string;
  recordUuid: string;
  value: string;
  currencyCode: string;
  currency?: CurrencyEntity;
}
