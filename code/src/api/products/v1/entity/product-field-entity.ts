import { PropertyEntity } from './property-entity';
import { PropertyValueEntity } from './property-value-entity';
export interface ProductFieldEntity {
  propertyCode: string;
  required: boolean;
  multiple: boolean;
  sortOrder: number;
  property: PropertyEntity;
  values: PropertyValueEntity[];
}
