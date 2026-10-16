import { Expose, Transform } from 'class-transformer';
import {
  IsUUID,
  IsString,
  IsOptional,
  MaxLength,
  IsBoolean,
  IsIn,
  IsInt,
  Min,
  Max,
  Validate,
  ValidateIf,
} from 'class-validator';
import { RangeMaximumConstraint } from './validation/range-maximum.constraint';

export class StoreQueryDto {
  @Expose()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(256)
  search?: string;

  @Expose()
  @IsOptional()
  @IsUUID()
  shopUuid?: string;

  @Expose()
  @IsOptional()
  @IsUUID()
  productUuid?: string;

  @Expose()
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(['active', 'disabled', 'archived'])
  productStatus?: 'active' | 'disabled' | 'archived';

  @Expose()
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(['active', 'disabled', 'archived'])
  variantStatus?: 'active' | 'disabled' | 'archived';

  @Expose()
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  productShowing?: boolean;

  @Expose()
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  variantShowing?: boolean;

  @Expose()
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  quantityMin?: number;

  @Expose()
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  @Validate(RangeMaximumConstraint, ['quantityMin'])
  quantityMax?: number;

  @Expose()
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  reservedMin?: number;

  @Expose()
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  @Validate(RangeMaximumConstraint, ['reservedMin'])
  reservedMax?: number;

  @Expose()
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  availableMin?: number;

  @Expose()
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  @Validate(RangeMaximumConstraint, ['availableMin'])
  availableMax?: number;
}
