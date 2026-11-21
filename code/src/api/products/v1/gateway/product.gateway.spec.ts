import { of } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';

import { ProductGateway } from './product.gateway';

describe(ProductGateway.name, () => {
  it.each([undefined, true, false])('passes withEmptyProperties=%s to Product', async (withEmptyProperties) => {
    const send = jest.fn().mockReturnValue(of({ uuid: 'product' }));
    const gateway = new ProductGateway({ send } as unknown as ClientProxy);

    await expect(
      gateway.getByUuid('product', withEmptyProperties === undefined ? undefined : { withEmptyProperties }),
    ).resolves.toEqual({ uuid: 'product' });
    expect(send).toHaveBeenCalledWith(
      { cmd: 'catalog.v2.product.getByUuid' },
      { uuid: 'product', withEmptyProperties: withEmptyProperties ?? true },
    );
  });
});
