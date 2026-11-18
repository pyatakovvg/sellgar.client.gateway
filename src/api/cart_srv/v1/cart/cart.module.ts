import { Module } from '@nestjs/common';
import { ApiIdentityV1Module } from '../../../identity_srv/v1/api.module';
import { CartServiceClient } from '../shared/cart-service.client';
import { CartService } from './application/cart.service';
import { CartController } from './presentation/cart.controller';
@Module({ imports: [ApiIdentityV1Module], controllers: [CartController], providers: [CartServiceClient, CartService] })
export class CartModule {}
