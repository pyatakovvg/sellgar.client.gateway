export interface Meta {
  totalRows: number;
}

export interface StoreProductResult {
  data: StoreProductEntity[];
  meta: Meta;
}

export interface ProductResult {
  data: ProductEntity[];
  meta: Meta;
}

export interface StoreOfferResult {
  data: StoreOfferEntity[];
  meta: Meta;
}

export interface StoreOfferDetailEntity {
  offer: StoreOfferEntity;
  siblingOffers: StoreOfferEntity[];
}

export interface StoreProductEntity {
  uuid: string;
  productUuid: string;
  article: string;
  status: string;
  showing: boolean;
  offers?: StoreOfferEntity[];
  createdAt: string;
  updatedAt: string;
}

export interface StoreOfferEntity {
  uuid: string;
  storeProductUuid: string;
  shopUuid: string;
  productUuid: string;
  variantUuid: string;
  storeProductArticle: string;
  article?: string | null;
  status: string;
  showing: boolean;
  productSnapshot?: {
    productUuid: string;
    name: string;
    status: string;
  } | null;
  variantSnapshot?: {
    variantUuid: string;
    productUuid: string;
    name: string;
    status: string;
  } | null;
  currentPrice?: PriceHistoryEntity | null;
  inventory?: OfferInventoryEntity | null;
  createdAt: string;
  updatedAt: string;
}

export interface PriceHistoryEntity {
  uuid: string;
  value: string;
  currencyCode: string;
  currency?: CurrencyEntity;
}

export interface CurrencyEntity {
  code: string;
  value: string;
}

export interface OfferInventoryEntity {
  quantity: number;
  reserved: number;
}

export interface ProductEntity {
  uuid: string;
  name: string;
  description: string;
  status: string;
  brand?: BrandEntity | null;
  category?: CategoryEntity | null;
  properties?: ProductPropertyEntity[];
  variants?: VariantEntity[];
}

export interface BrandEntity {
  uuid: string;
  code: string;
  name: string;
}

export interface CategoryEntity {
  uuid: string;
  code: string;
  name: string;
}

export interface VariantEntity {
  uuid: string;
  name: string;
  description: string;
  status: string;
  properties?: VariantPropertyEntity[];
  images?: VariantImageEntity[];
}

export interface ProductPropertyEntity {
  uuid: string;
  optionUuid?: string | null;
  value: string;
  property?: {
    uuid: string;
    code: string;
    name: string;
  };
  option?: ProductPropertyOptionEntity | null;
}

export interface VariantPropertyEntity {
  uuid: string;
  optionUuid?: string | null;
  value: string;
  property?: {
    uuid: string;
    code: string;
    name: string;
  };
  option?: ProductPropertyOptionEntity | null;
}

export interface ProductPropertyOptionEntity {
  uuid: string;
  code: string;
  name: string;
  metadata?: ProductPropertyOptionMetadataEntity[];
}

export interface ProductPropertyOptionMetadataEntity {
  uuid: string;
  valueType: 'TEXT' | 'COLOR' | 'IMAGE' | 'ICON';
  sortOrder: number;
  textValue?: string | null;
  colorValue?: string | null;
  fileUuid?: string | null;
  imageUrl?: string | null;
  iconCode?: string | null;
}

export interface VariantImageEntity {
  uuid: string;
  imageUuid: string;
  image?: {
    uuid: string;
    fileName: string;
  };
  order: number;
  alt?: string | null;
}

export interface PublicProductResult {
  data: PublicOfferCard[];
  meta: Meta;
}

export interface PublicOfferCard {
  uuid: string;
  offerUuid: string;
  storeProductUuid: string;
  productUuid: string;
  variantUuid: string;
  article: string;
  name: string;
  description: string;
  product: PublicProductSummary;
  brand?: PublicDictionaryItem | null;
  category?: PublicDictionaryItem | null;
  variant: PublicVariant;
  currentPrice?: PublicPrice | null;
  inventory?: PublicInventory | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicOfferDetail {
  offer: PublicOfferCard;
  siblingOffers: PublicOfferCard[];
}

export interface PublicProductSummary {
  uuid: string;
  name: string;
  description: string;
  properties: PublicProductProperty[];
}

export interface PublicDictionaryItem {
  uuid: string;
  code?: string;
  name: string;
}

export interface PublicOffer {
  uuid: string;
  article?: string | null;
  variant: PublicVariant;
  currentPrice?: PublicPrice | null;
  inventory?: PublicInventory | null;
}

export interface PublicVariant {
  uuid: string;
  name: string;
  description: string;
  properties: PublicVariantProperty[];
  images: PublicVariantImage[];
}

export interface PublicVariantProperty {
  uuid: string;
  optionUuid?: string | null;
  value: string;
  property?: PublicDictionaryItem | null;
  option?: PublicPropertyOption | null;
}

export interface PublicProductProperty {
  uuid: string;
  optionUuid?: string | null;
  value: string;
  property?: PublicDictionaryItem | null;
  option?: PublicPropertyOption | null;
}

export interface PublicPropertyOption {
  uuid: string;
  name: string;
  metadata: PublicPropertyOptionMetadata[];
}

export interface PublicPropertyOptionMetadata {
  uuid: string;
  valueType: 'TEXT' | 'COLOR' | 'IMAGE' | 'ICON';
  sortOrder: number;
  textValue?: string | null;
  colorValue?: string | null;
  fileUuid?: string | null;
  iconCode?: string | null;
}

export interface PublicVariantImage {
  uuid: string;
  imageUuid: string;
  imageUrl: string;
  fileName?: string;
  order: number;
  alt?: string | null;
}

export interface PublicPrice {
  uuid: string;
  value: string;
  currencyCode: string;
  currency?: CurrencyEntity;
}

export interface PublicInventory {
  quantity: number;
  reserved: number;
  available: number;
}
