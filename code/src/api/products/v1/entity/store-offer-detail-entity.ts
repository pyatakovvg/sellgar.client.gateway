import { CategoryPathEntity } from './category-path-entity';
import { StoreOfferEntity } from './store-offer-entity';
export interface StoreOfferDetailEntity {
  categories: CategoryPathEntity[];
  offer: StoreOfferEntity;
  siblingOffers: StoreOfferEntity[];
}
