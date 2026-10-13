import { describe, it, expect, jest } from '@jest/globals';
import { ProductsService } from './products.service';
import { ProductGateway } from './gateway/product.gateway';
import { StoreProductGateway } from './gateway/store-product.gateway';
import { ProductEntity, StoreOfferEntity } from './product.types';

describe(ProductsService.name, () => {
  const product: ProductEntity = {
    uuid: 'product',
    typeUuid: 'type',
    typeVersion: 1,
    version: 1,
    name: 'Майка',
    description: null,
    status: 'active',
    brandCode: 'brand',
    properties: [],
    variants: [{ uuid: 'variant', name: 'Синяя', description: null, status: 'active', properties: [], images: [] }],
  };
  const record = {
    uuid: 'record',
    offerUuid: 'offer',
    article: 'BLUE-S',
    version: 1,
    clarifications: [
      { position: 0, value: 'S евростандарт' },
      { position: 1, value: 'Подарочная упаковка' },
    ],
    inventory: {
      uuid: 'inventory',
      recordUuid: 'record',
      quantity: 12,
      reserved: 1,
      available: 11,
      version: 2,
      updatedAt: '2026-10-12T00:00:00Z',
    },
    createdAt: '2026-10-12T00:00:00Z',
    updatedAt: '2026-10-12T00:00:00Z',
  };
  const offer: StoreOfferEntity = {
    uuid: 'offer',
    storeProductUuid: 'store-product',
    shopUuid: 'shop',
    productUuid: 'product',
    variantUuid: 'variant',
    status: 'active',
    showing: true,
    records: [record],
    createdAt: '2026-10-12T00:00:00Z',
    updatedAt: '2026-10-12T00:00:00Z',
  };
  const setup = () => {
    const store = {
      findOffersAll: jest
        .fn<StoreProductGateway['findOffersAll']>()
        .mockResolvedValue({ data: [offer], meta: { totalRows: 1 } }),
      findOfferByUuid: jest
        .fn<StoreProductGateway['findOfferByUuid']>()
        .mockResolvedValue({ offer, siblingOffers: [offer] }),
    };
    const catalog = {
      getByUuid: jest.fn<ProductGateway['getByUuid']>().mockResolvedValue(product),
      getBrand: jest
        .fn<ProductGateway['getBrand']>()
        .mockResolvedValue({ code: 'brand', name: 'Бренд', description: null }),
    };
    return {
      store,
      catalog,
      service: new ProductsService(store as unknown as StoreProductGateway, catalog as unknown as ProductGateway),
    };
  };
  it('returns selectable accounting records with their own article and stock', async () => {
    const { service, catalog } = setup();
    const result = await service.findAll({});
    expect(result.data[0].records).toEqual([record]);
    expect(result.data[0]).not.toHaveProperty('article');
    expect(result.data[0]).not.toHaveProperty('inventory');
    expect(catalog.getByUuid).toHaveBeenCalledTimes(1);
    expect(catalog.getByUuid).toHaveBeenCalledWith('product');
  });
  it('uses the same accounting records in offer details and excludes an archived catalog variant', async () => {
    const { service, catalog } = setup();
    const result = await service.findOfferByUuid('offer');
    expect(result.offer.records).toEqual([record]);
    expect(result.siblingOffers[0].records).toEqual([record]);
    catalog.getByUuid.mockResolvedValue({ ...product, variants: [{ ...product.variants[0], status: 'archived' }] });
    expect((await service.findAll({})).data).toEqual([]);
  });
});
