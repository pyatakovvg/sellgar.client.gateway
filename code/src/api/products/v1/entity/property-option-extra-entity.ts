export interface PropertyOptionExtraEntity {
  type: 'TEXT' | 'COLOR' | 'IMAGE';
  sortOrder: number;
  textDisplay: 'TEXT' | 'ICON' | null;
  valueText: string | null;
  valueColor: string | null;
  imageUuid: string | null;
}
