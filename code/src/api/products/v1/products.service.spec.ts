import { describe, it, expect, jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { ProductsService } from './products.service';
import { ProductGateway } from './gateway/product.gateway';
import { StoreProductGateway } from './gateway/store-product.gateway';
import { ProductEntity, StoreOfferEntity } from './product.types';

describe(ProductsService.name, () => {
  const shopUuid = 'be250838-85f9-41fa-b9f3-99aba3590640';
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
    currentPrice: { uuid: 'price', recordUuid: 'record', value: '125.50', currencyCode: 'RUB' },
    order: 0,
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
    shopUuid,
    productUuid: 'product',
    variantUuid: 'variant',
    status: 'active',
    showing: true,
    records: [record],
    priceRange: { min: '125.50', max: '125.50', currencyCode: 'RUB' },
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
        .mockResolvedValue({ offer, siblingOffers: [offer], categories: [] }),
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
      service: new ProductsService(
        store as unknown as StoreProductGateway,
        catalog as unknown as ProductGateway,
        new ConfigService({ STOREFRONT_SHOP_UUID: shopUuid }),
      ),
    };
  };
  it('returns selectable accounting records with their own article and stock', async () => {
    const { service, catalog } = setup();
    const result = await service.findAll({});
    expect(result.data[0].records).toEqual([record]);
    expect(result.data[0].priceRange).toEqual(offer.priceRange);
    expect(result.data[0]).not.toHaveProperty('currentPrice');
    expect(result.data[0]).not.toHaveProperty('article');
    expect(result.data[0]).not.toHaveProperty('inventory');
    expect(catalog.getByUuid).toHaveBeenCalledTimes(1);
    expect(catalog.getByUuid).toHaveBeenCalledWith('product', { withEmptyProperties: false });
  });
  it('uses the same accounting records in offer details and excludes an archived catalog variant', async () => {
    const { service, catalog } = setup();
    const result = await service.findOfferByUuid('offer');
    expect(result.offer.records).toEqual([record]);
    expect(result.siblingOffers[0].records).toEqual([record]);
    expect(result.categories).toEqual([]);
    catalog.getByUuid.mockResolvedValue({ ...product, variants: [{ ...product.variants[0], status: 'archived' }] });
    expect((await service.findAll({})).data).toEqual([]);
  });
  it('puts the current offer first and preserves the order of the other available variants', async () => {
    const { service, store, catalog } = setup();
    const otherVariants = ['green', 'black', 'archived'].map<ProductEntity['variants'][number]>((uuid) => ({
      ...product.variants[0],
      uuid,
      status: uuid === 'archived' ? 'archived' : 'active',
    }));
    const otherOffers = otherVariants.map((variant) => ({
      ...offer,
      uuid: `${variant.uuid}-offer`,
      variantUuid: variant.uuid,
    }));
    catalog.getByUuid.mockResolvedValue({ ...product, variants: [...product.variants, ...otherVariants] });
    store.findOfferByUuid.mockResolvedValue({
      offer,
      siblingOffers: [otherOffers[0], otherOffers[1], offer, otherOffers[2]],
      categories: [],
    });

    const result = await service.findOfferByUuid('offer');

    expect(result.siblingOffers.map((item) => item.uuid)).toEqual(['offer', 'green-offer', 'black-offer']);
  });
  it('requests filled properties for catalog and offer reads', async () => {
    const { service, catalog } = setup();

    await service.findAll({});
    await service.findOfferByUuid('offer');

    expect(catalog.getByUuid).toHaveBeenCalledTimes(2);
    expect(catalog.getByUuid).toHaveBeenNthCalledWith(1, product.uuid, { withEmptyProperties: false });
    expect(catalog.getByUuid).toHaveBeenNthCalledWith(2, product.uuid, { withEmptyProperties: false });
  });
  it('passes every Store category path through the public offer contract', async () => {
    const { service, store } = setup();
    const categories = [
      {
        categoryUuid: 'leaf-one',
        items: [
          { uuid: 'root-one', name: 'Дом' },
          { uuid: 'leaf-one', name: 'Кружки' },
        ],
      },
      {
        categoryUuid: 'leaf-two',
        items: [
          { uuid: 'root-two', name: 'Туризм' },
          { uuid: 'leaf-two', name: 'Кружки' },
        ],
      },
    ];
    store.findOfferByUuid.mockResolvedValue({ offer, siblingOffers: [offer], categories });
    expect((await service.findOfferByUuid('offer')).categories).toEqual(categories);
  });
  it('adds storefront policy to the same flat query for lists and offer details', async () => {
    const { service, store } = setup();
    const policy = {
      search: 'BLUE-S',
      shopUuid,
      productStatus: 'active',
      productShowing: true,
      variantStatus: 'active',
      variantShowing: true,
      availableMin: 1,
    } as const;
    await service.findAll({ search: 'BLUE-S' });
    expect(store.findOffersAll).toHaveBeenCalledWith(policy);
    await service.findOfferByUuid('offer', { search: 'BLUE-S' });
    expect(store.findOfferByUuid).toHaveBeenCalledWith('offer', policy);
  });
  it('does not allow incoming query fields to override the configured shop or storefront policy', async () => {
    const { service, store } = setup();
    const query = { shopUuid: 'another-shop', productShowing: false, availableMin: 0, search: 'BLUE' };
    await service.findAll(query);
    await service.findOfferByUuid('offer', query);
    const expected = {
      search: 'BLUE',
      shopUuid,
      productStatus: 'active',
      productShowing: true,
      variantStatus: 'active',
      variantShowing: true,
      availableMin: 1,
    } as const;
    expect(store.findOffersAll).toHaveBeenCalledWith(expected);
    expect(store.findOfferByUuid).toHaveBeenCalledWith('offer', expected);
  });
});
