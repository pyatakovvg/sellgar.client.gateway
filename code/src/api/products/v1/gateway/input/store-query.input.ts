export interface StoreQueryInput {
  search?: string;
  shopUuid?: string;
  productUuid?: string;
  productStatus?: 'active' | 'disabled' | 'archived';
  variantStatus?: 'active' | 'disabled' | 'archived';
  productShowing?: boolean;
  variantShowing?: boolean;
  quantityMin?: number;
  quantityMax?: number;
  reservedMin?: number;
  reservedMax?: number;
  availableMin?: number;
  availableMax?: number;
}
