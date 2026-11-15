import { CategoryPathEntity } from './category-path-entity';
import { PublicOfferCard } from './public-offer-card';
export interface PublicOfferDetail {
  categories: CategoryPathEntity[];
  offer: PublicOfferCard;
  siblingOffers: PublicOfferCard[];
}
