import { StoreOfferEntity } from './store-offer-entity';
export interface StoreProductEntity {
  uuid: string;
  productUuid: string;
  shopUuid: string;
  status: string;
  showing: boolean;
  offers: StoreOfferEntity[];
  createdAt: string;
  updatedAt: string;
}
