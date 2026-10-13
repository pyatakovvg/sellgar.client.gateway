export interface RecordInventoryEntity {
  uuid: string;
  recordUuid: string;
  quantity: number;
  reserved: number;
  available: number;
  version: number;
  updatedAt: string;
}
