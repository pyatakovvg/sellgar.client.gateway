import { Injectable } from '@nestjs/common';
import { ProductGateway } from './gateway/product.gateway';
import { StoreProductGateway } from './gateway/store-product.gateway';
import {
  ProductEntity,
  StoreOfferEntity,
  BrandEntity,
  PublicOfferCard,
  PublicOfferDetail,
  PublicProductResult,
} from './product.types';

@Injectable()
export class ProductsService {
  constructor(
    private readonly storeProductGateway: StoreProductGateway,
    private readonly productGateway: ProductGateway,
  ) {}
  async findAll(query: Record<string, unknown>): Promise<PublicProductResult> {
    const offers = await this.storeProductGateway.findOffersAll();
    const ids = [...new Set(offers.data.map((offer) => offer.productUuid))];
    const products = await Promise.all(ids.map((uuid) => this.productGateway.getByUuid(uuid)));
    const byUuid = new Map(products.map((product) => [product.uuid, product]));
    const brands = await this.loadBrands(products);
    const data = offers.data
      .map((offer) => {
        const product = byUuid.get(offer.productUuid);
        return product ? this.compose(offer, product, brands.get(product.brandCode) ?? null) : null;
      })
      .filter((offer): offer is PublicOfferCard => offer !== null);
    return { data, meta: { totalRows: data.length } };
  }
  async findOfferByUuid(uuid: string): Promise<PublicOfferDetail> {
    const detail = await this.storeProductGateway.findOfferByUuid(uuid);
    const product = await this.productGateway.getByUuid(detail.offer.productUuid);
    const brands = await this.loadBrands([product]);
    const brand = brands.get(product.brandCode) ?? null;
    const offer = this.compose(detail.offer, product, brand);
    if (!offer) throw new Error('Store offer references an unavailable catalog variant');
    const siblingOffers = detail.siblingOffers
      .map((item) => this.compose(item, product, brand))
      .filter((item): item is PublicOfferCard => item !== null);
    return { offer, siblingOffers };
  }
  private async loadBrands(products: ProductEntity[]): Promise<Map<string, BrandEntity>> {
    const codes = [...new Set(products.map((product) => product.brandCode).filter(Boolean))];
    const brands = await Promise.all(codes.map((code) => this.productGateway.getBrand(code)));
    return new Map(brands.map((brand) => [brand.code, brand]));
  }
  private compose(offer: StoreOfferEntity, product: ProductEntity, brand: BrandEntity | null): PublicOfferCard | null {
    const variant = product.variants.find((item) => item.uuid === offer.variantUuid);
    if (product.status !== 'active' || !variant || variant.status !== 'active') return null;
    return {
      uuid: offer.uuid,
      offerUuid: offer.uuid,
      storeProductUuid: offer.storeProductUuid,
      productUuid: product.uuid,
      variantUuid: variant.uuid,
      name: variant.name || product.name,
      description: variant.description || product.description,
      product: {
        uuid: product.uuid,
        name: product.name,
        description: product.description,
        properties: product.properties,
      },
      brand,
      variant: {
        uuid: variant.uuid,
        name: variant.name,
        description: variant.description,
        properties: variant.properties,
        images: variant.images
          .map((image) => ({
            imageUuid: image.imageUuid,
            fileName: image.fileName,
            order: image.sortOrder,
            imageUrl: `/v1/files/${image.imageUuid}`,
          }))
          .sort((left, right) => left.order - right.order),
      },
      records: offer.records,
      currentPrice: offer.currentPrice ?? null,
      createdAt: offer.createdAt,
      updatedAt: offer.updatedAt,
    };
  }
}
