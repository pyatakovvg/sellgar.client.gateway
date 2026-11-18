import { Expose, Type } from 'class-transformer';
import { IsArray, IsDefined, IsString, IsUUID, Matches, ValidateIf, ValidateNested } from 'class-validator';

import { CartItemEntity } from './cart-item.entity';

export class CartIdentityEntity {
  @Expose() @IsUUID() uuid: string;
  @Expose() @IsString() @Matches(/^(0|[1-9]\d*)$/) version: string;
}

export class CartShopEntity {
  @Expose()
  @IsUUID()
  uuid: string;

  @Expose()
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  name: string | null;
}

export class CartEntity extends CartIdentityEntity {
  @Expose()
  @IsDefined()
  @ValidateNested()
  @Type(() => CartShopEntity)
  shop: CartShopEntity;

  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemEntity)
  items: CartItemEntity[];

  @Expose()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currencyCode: string;

  @Expose()
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @Matches(/^\d+\.\d{2}$/)
  itemsTotal: string | null;
}
