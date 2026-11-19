import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { StoreQueryDto } from './dto/store-query.dto';
import { StoreQueryInput } from './input/store-query.input';

import { StoreOfferDetailEntity, StoreOfferResult, StoreProductResult } from '../product.types';

@Injectable()
export class StoreProductGateway {
  constructor(@Inject('STORE_COMMAND_SERVICE') private readonly storeProxy: ClientProxy) {}

  async findAll(query: Record<string, unknown>): Promise<StoreProductResult> {
    return firstValueFrom(this.storeProxy.send({ cmd: 'store.product.getAll' }, { query }));
  }

  async findOffersAll(input: StoreQueryInput = {}): Promise<StoreOfferResult> {
    const query = await this.createQuery(input);
    return firstValueFrom(this.storeProxy.send({ cmd: 'store.offer.getAll' }, { query }));
  }

  async findOfferByUuid(uuid: string, input: StoreQueryInput = {}): Promise<StoreOfferDetailEntity> {
    const query = await this.createQuery(input);
    return firstValueFrom(this.storeProxy.send({ cmd: 'store.offer.getByUuid' }, { uuid, query }));
  }
  private async createQuery(input: StoreQueryInput): Promise<StoreQueryDto> {
    const query = plainToInstance(StoreQueryDto, input, { excludeExtraneousValues: true });
    await validateOrReject(query);
    return query;
  }
}
