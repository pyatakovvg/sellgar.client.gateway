import { PropertyOptionExtraEntity } from './property-option-extra-entity';
export interface PropertyOptionEntity {
  code: string;
  name: string;
  sortOrder: number;
  extras: PropertyOptionExtraEntity[];
}
