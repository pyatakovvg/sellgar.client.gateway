import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

import { ProductEntity, ProductResult } from '../product.types';

@Injectable()
export class ProductGateway {
  constructor(@Inject('PRODUCT_COMMAND_SERVICE') private readonly productProxy: ClientProxy) {}

  async findAll(query: Record<string, unknown>): Promise<ProductResult> {
    return firstValueFrom(this.productProxy.send({ cmd: 'product.getAll' }, query));
  }

  async findByUuid(uuid: string): Promise<ProductEntity> {
    return firstValueFrom(this.productProxy.send({ cmd: 'product.getByUuid' }, { uuid }));
  }
}
