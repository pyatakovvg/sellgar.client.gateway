import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { ProductEntity, BrandEntity } from '../product.types';
import { ProductQueryInput } from './input/product-query.input';

@Injectable()
export class ProductGateway {
  constructor(@Inject('PRODUCT_COMMAND_SERVICE') private readonly productProxy: ClientProxy) {}
  getByUuid(uuid: string, query: ProductQueryInput = {}): Promise<ProductEntity> {
    return firstValueFrom(
      this.productProxy
        .send({ cmd: 'catalog.v2.product.getByUuid' }, { uuid, withEmptyProperties: query.withEmptyProperties ?? true })
        .pipe(timeout(10000)),
    );
  }
  getBrand(code: string): Promise<BrandEntity> {
    return firstValueFrom(this.productProxy.send({ cmd: 'catalog.v2.brand.getByCode' }, { code }).pipe(timeout(10000)));
  }
}
