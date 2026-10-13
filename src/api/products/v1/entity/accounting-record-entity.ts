import { RecordClarificationEntity } from './record-clarification-entity';
import { RecordInventoryEntity } from './record-inventory-entity';
export interface AccountingRecordEntity {
  uuid: string;
  offerUuid: string;
  article: string;
  version: number;
  clarifications: RecordClarificationEntity[];
  inventory: RecordInventoryEntity;
  createdAt: string;
  updatedAt: string;
}
