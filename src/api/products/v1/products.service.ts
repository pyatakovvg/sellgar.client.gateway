import { Injectable } from '@nestjs/common';

import { ProductGateway } from './gateway/product.gateway';
import { StoreProductGateway } from './gateway/store-product.gateway';
import {
  BrandEntity,
  CategoryEntity,
  PriceHistoryEntity,
  ProductPropertyEntity,
  ProductEntity,
  PublicDictionaryItem,
  PublicOfferCard,
  PublicOfferDetail,
  PublicInventory,
  PublicPrice,
  PublicProductProperty,
  PublicProductResult,
  PublicVariant,
  PublicVariantImage,
  PublicVariantProperty,
  StoreOfferEntity,
  VariantEntity,
} from './product.types';

const ACTIVE_STATUS = 'active';

type VariantProperty = NonNullable<VariantEntity['properties']>[number];
type ProductProperty = NonNullable<ProductEntity['properties']>[number];
type VariantImage = NonNullable<VariantEntity['images']>[number];

@Injectable()
export class ProductsService {
  constructor(
    private readonly storeProductGateway: StoreProductGateway,
    private readonly productGateway: ProductGateway,
  ) {}

  async findAll(query: Record<string, unknown>): Promise<PublicProductResult> {
    void query;

    const storeOffers = await this.storeProductGateway.findOffersAll();
    const data = await this.composeOfferCards(storeOffers.data ?? []);

    return {
      data,
      meta: {
        totalRows: data.length,
      },
    };
  }

  async findOfferByUuid(uuid: string): Promise<PublicOfferDetail> {
    const detail = await this.storeProductGateway.findOfferByUuid(uuid);
    const product = await this.productGateway.findByUuid(detail.offer.productUuid);
    const offer = this.composeOfferCard(detail.offer, product);
    const siblingOffers = detail.siblingOffers
      .map((siblingOffer) => this.composeOfferCard(siblingOffer, product))
      .filter((siblingOffer): siblingOffer is PublicOfferCard => Boolean(siblingOffer));

    if (!offer) {
      throw new Error('Store offer product variant is missing');
    }

    return {
      offer,
      siblingOffers,
    };
  }

  private async composeOfferCards(storeOffers: StoreOfferEntity[]) {
    const productUuid = Array.from(new Set(storeOffers.map((offer) => offer.productUuid)));

    if (productUuid.length === 0) {
      return [];
    }

    const products = await this.productGateway.findAll({ uuid: productUuid });
    const productsByUuid = new Map((products.data ?? []).map((product) => [product.uuid, product]));
    const data: PublicOfferCard[] = [];

    for (const offer of storeOffers) {
      const product = productsByUuid.get(offer.productUuid);

      if (!product) {
        continue;
      }

      const offerCard = this.composeOfferCard(offer, product);

      if (offerCard) {
        data.push(offerCard);
      }
    }

    return data;
  }

  private composeOfferCard(offer: StoreOfferEntity, product: ProductEntity): PublicOfferCard | null {
    if (!this.isActive(product.status)) {
      return null;
    }

    const variantsByUuid = new Map((product.variants ?? []).map((variant) => [variant.uuid, variant]));
    const variant = variantsByUuid.get(offer.variantUuid);

    if (!variant || !this.isActive(variant.status)) {
      return null;
    }

    return {
      uuid: offer.uuid,
      offerUuid: offer.uuid,
      storeProductUuid: offer.storeProductUuid,
      productUuid: product.uuid,
      variantUuid: variant.uuid,
      article: offer.article ?? offer.storeProductArticle,
      name: variant.name || product.name,
      description: variant.description || product.description,
      product: {
        uuid: product.uuid,
        name: product.name,
        description: product.description,
        properties: (product.properties ?? []).map((property) => this.mapProductProperty(property)),
      },
      brand: this.mapDictionaryItem(product.brand),
      category: this.mapDictionaryItem(product.category),
      variant: this.mapVariant(variant),
      currentPrice: this.mapPrice(offer.currentPrice),
      inventory: this.mapInventory(offer.inventory),
      createdAt: offer.createdAt,
      updatedAt: offer.updatedAt,
    };
  }

  private mapVariant(variant: VariantEntity): PublicVariant {
    return {
      uuid: variant.uuid,
      name: variant.name,
      description: variant.description,
      properties: (variant.properties ?? []).map((property) => this.mapVariantProperty(property)),
      images: (variant.images ?? [])
        .map((image) => this.mapVariantImage(image))
        .sort((left, right) => left.order - right.order),
    };
  }

  private mapVariantProperty(property: VariantProperty): PublicVariantProperty {
    return {
      uuid: property.uuid,
      value: property.value,
      property: this.mapDictionaryItem(property.property),
    };
  }

  private mapProductProperty(property: ProductProperty): PublicProductProperty {
    return {
      uuid: property.uuid,
      value: property.value,
      property: this.mapDictionaryItem(property.property),
    };
  }

  private mapVariantImage(image: VariantImage): PublicVariantImage {
    return {
      uuid: image.uuid,
      imageUuid: image.imageUuid,
      imageUrl: `/v1/files/${image.imageUuid}`,
      fileName: image.image?.fileName,
      order: image.order,
      alt: image.alt,
    };
  }

  private mapDictionaryItem(
    item?: BrandEntity | CategoryEntity | ProductPropertyEntity['property'] | VariantProperty['property'] | null,
  ): PublicDictionaryItem | null {
    if (!item) {
      return null;
    }

    return {
      uuid: item.uuid,
      code: 'code' in item ? item.code : undefined,
      name: item.name,
    };
  }

  private mapPrice(price?: PriceHistoryEntity | null): PublicPrice | null {
    if (!price) {
      return null;
    }

    return {
      uuid: price.uuid,
      value: price.value,
      currencyCode: price.currencyCode,
      currency: price.currency,
    };
  }

  private mapInventory(inventory?: { quantity: number; reserved: number } | null): PublicInventory | null {
    if (!inventory) {
      return null;
    }

    return {
      quantity: inventory.quantity,
      reserved: inventory.reserved,
      available: inventory.quantity - inventory.reserved,
    };
  }

  private isActive(status: string) {
    return status === ACTIVE_STATUS;
  }
}
