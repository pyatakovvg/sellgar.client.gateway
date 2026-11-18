import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientPrincipal } from '../../../../identity_srv/v1/session.types';
import { CartServiceClient } from '../../shared/cart-service.client';
import { CartServiceCommand } from '../../shared/cart-service.constants';
import { CartEntity } from '../domain/cart.entity';
import { CartItemMutationEntity } from '../domain/cart-item-mutation.entity';
import { AddCartItemDto, RemoveCartItemDto, SetCartItemDto } from '../presentation/dto/cart-item.dto';

@Injectable()
export class CartService {
  constructor(
    private readonly config: ConfigService,
    private readonly client: CartServiceClient,
  ) {}

  get(principal: ClientPrincipal) {
    return this.client.request(CartServiceCommand.get, this.scope(principal), CartEntity);
  }

  add(principal: ClientPrincipal, input: AddCartItemDto) {
    return this.client.request(
      CartServiceCommand.add,
      { ...input, ...this.scope(principal), idempotencyKey: randomUUID() },
      CartItemMutationEntity,
    );
  }

  setQuantity(principal: ClientPrincipal, recordUuid: string, input: SetCartItemDto) {
    const { version, ...changes } = input;
    return this.client.request(
      CartServiceCommand.setQuantity,
      { ...changes, expectedItemVersion: version, recordUuid, ...this.scope(principal), idempotencyKey: randomUUID() },
      CartItemMutationEntity,
    );
  }

  remove(principal: ClientPrincipal, recordUuid: string, input: RemoveCartItemDto) {
    const { version, ...changes } = input;
    return this.client.request(
      CartServiceCommand.remove,
      { ...changes, expectedItemVersion: version, recordUuid, ...this.scope(principal), idempotencyKey: randomUUID() },
      CartItemMutationEntity,
    );
  }

  private scope(principal: ClientPrincipal) {
    return { ownerUuid: principal.ownerUuid, shopUuid: this.config.getOrThrow<string>('STOREFRONT_SHOP_UUID') };
  }
}
