import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

import { StoreOfferDetailEntity, StoreOfferResult, StoreProductResult } from '../product.types';

@Injectable()
export class StoreProductGateway {
  constructor(@Inject('STORE_COMMAND_SERVICE') private readonly storeProxy: ClientProxy) {}

  async findAll(query: Record<string, unknown>): Promise<StoreProductResult> {
    return firstValueFrom(this.storeProxy.send({ cmd: 'store.product.getAll' }, { query }));
  }

  async findOffersAll(): Promise<StoreOfferResult> {
    return firstValueFrom(this.storeProxy.send({ cmd: 'store.offer.getAll' }, {}));
  }

  async findOfferByUuid(uuid: string): Promise<StoreOfferDetailEntity> {
    return firstValueFrom(this.storeProxy.send({ cmd: 'store.offer.getByUuid' }, { uuid }));
  }
}
