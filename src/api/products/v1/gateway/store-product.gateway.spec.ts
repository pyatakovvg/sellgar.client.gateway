import { ClientProxy } from '@nestjs/microservices';
import { of } from 'rxjs';
import { StoreProductGateway } from './store-product.gateway';

describe(StoreProductGateway.name, () => {
  const send = jest.fn().mockReturnValue(of({ data: [], meta: { totalRows: 0 } }));
  const gateway = new StoreProductGateway({ send } as unknown as ClientProxy);
  beforeEach(() => send.mockClear());
  it('passes a validated flat query to RMQ for lists and details', async () => {
    const query = { search: 'BLUE-S', productShowing: true, variantShowing: false, availableMin: 0, availableMax: 0 };
    await gateway.findOffersAll(query);
    expect(send).toHaveBeenCalledWith({ cmd: 'store.offer.getAll' }, { query: expect.objectContaining(query) });
    await gateway.findOfferByUuid('offer', query);
    expect(send).toHaveBeenCalledWith(
      { cmd: 'store.offer.getByUuid' },
      { uuid: 'offer', query: expect.objectContaining(query) },
    );
  });
  it('rejects invalid bounds before sending a request', async () => {
    await expect(gateway.findOffersAll({ availableMin: 5, availableMax: 0 })).rejects.toBeDefined();
    expect(send).not.toHaveBeenCalled();
  });
});
