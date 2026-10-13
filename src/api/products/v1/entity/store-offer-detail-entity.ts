import { StoreOfferEntity } from './store-offer-entity';
export interface StoreOfferDetailEntity {
  offer: StoreOfferEntity;
  siblingOffers: StoreOfferEntity[];
}
