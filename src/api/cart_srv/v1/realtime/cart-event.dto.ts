import { Type } from 'class-transformer';
import {
  Equals,
  IsArray,
  IsDefined,
  IsIn,
  IsInt,
  IsISO8601,
  IsObject,
  IsString,
  IsUUID,
  Matches,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class CartTargetDto {
  @IsUUID() cartUuid: string;
  @IsUUID() ownerUuid: string;
  @IsUUID() shopUuid: string;
}
export class CartChangedPayloadDto extends CartTargetDto {
  @IsString() @Matches(/^(0|[1-9]\d*)$/) version: string;
}
export class CartSourceDto {
  @IsString() producer: string;
  @IsIn(['shop', 'product', 'store_product', 'record_inventory']) aggregateType: string;
  @IsUUID() aggregateUuid: string;
  @IsInt() @Min(1) version: number;
  @ValidateIf((_o, v) => v !== null) @IsUUID() eventUuid: string | null;
}
export class CartProjectionPayloadDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => CartTargetDto) targets: CartTargetDto[];
  @IsDefined() @IsObject() @ValidateNested() @Type(() => CartSourceDto) source: CartSourceDto;
}
export class CartEventDto {
  @IsUUID() eventUuid: string;
  @Equals('cart_srv') producer: string;
  @Equals(1) schemaVersion: number;
  @IsIn(['cart.created', 'cart.updated', 'cart.closed', 'cart.projection.updated']) eventType: string;
  @IsUUID() aggregateUuid: string;
  @IsString() aggregateType: string;
  @Type(() => String) @IsString() @Matches(/^(0|[1-9]\d*)$/) aggregateVersion: string;
  @IsISO8601() occurredAt: string;
  @IsObject() payload: Record<string, unknown>;
}
