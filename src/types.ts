export type TaskStatus = '已拍' | '待拍' | '已发';

export type HitStatus = '爆款' | '小爆款' | null;

export type AssetPurpose = 'account-cover';

export type AssetStatus = 'ready' | 'pending';

export type AdRecordType = 'income' | 'expense';

export type IncomeSettlement = 'settled' | 'unsettled';

export interface Asset {
  id: string;
  key: string;
  url: string;
  mimeType: string;
  size: number;
  purpose: AssetPurpose;
  status: AssetStatus;
  ownerEntityType: string | null;
  ownerEntityId: string | null;
  createdAt: string;
}

export interface Account {
  id: string;
  name: string;
  coverAssetId: string | null;
  coverImageUrl: string;
  coverOffsetY: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  accountId: string;
  title: string;
  date: string;
  location: string;
  status: TaskStatus;
  sortOrder: number;
  hitStatus: HitStatus;
  reviewData: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdRecord {
  id: string;
  accountId: string;
  title: string;
  date: string;
  note: string;
  type: AdRecordType;
  amount: number;
  settlementStatus: IncomeSettlement | null;
  createdAt: string;
  updatedAt: string;
}

export interface UploadSignature {
  uploadUrl: string;
  objectKey: string;
  headers: Record<string, string>;
  expiresAt: string;
}

export interface AccountInput {
  name: string;
  coverAssetId?: string | null;
  coverImageUrl: string;
  coverOffsetY?: number;
  sortOrder?: number;
}

export interface TaskInput {
  accountId: string;
  title: string;
  date: string;
  location?: string;
  status: TaskStatus;
  sortOrder?: number;
}

export interface TaskPatch extends Partial<TaskInput> {}

export interface TaskReviewInput {
  hitStatus: HitStatus;
  reviewData: string;
}

export interface AdRecordInput {
  accountId: string;
  title: string;
  date: string;
  note?: string;
  type: AdRecordType;
  amount: number;
  settlementStatus?: IncomeSettlement | null;
}

export interface AdRecordPatch extends Partial<AdRecordInput> {}

export interface AgentResolvedAccount {
  id: string;
  name: string;
}

export interface AgentAccountSummary extends AgentResolvedAccount {
  sortOrder: number;
  updatedAt: string;
}

export interface AgentAccountListResponse {
  accounts: AgentAccountSummary[];
}

export type AgentAccountResolveResponse =
  | {
      match: 'exact';
      account: AgentResolvedAccount;
    }
  | {
      match: 'not_found';
      candidates: AgentResolvedAccount[];
    }
  | {
      match: 'ambiguous';
      candidates: AgentResolvedAccount[];
    };

export interface AgentTaskBatchItemInput {
  accountId: string;
  title: string;
  date: string;
  status: TaskStatus;
  location?: string;
}

export interface AgentTaskBatchInput {
  source: string;
  timezone?: string;
  rawText?: string;
  tasks: AgentTaskBatchItemInput[];
}

export interface AgentTaskBatchSkippedItem {
  index: number;
  reason: string;
}

export interface AgentTaskBatchResponse {
  requestId: string;
  created: Task[];
  skipped: AgentTaskBatchSkippedItem[];
}

export interface AgentTaskQueryFilters {
  accountId: string | null;
  date: string | null;
  status: TaskStatus | null;
  limit: number;
}

export interface AgentTaskListResponse {
  tasks: Task[];
  filters: AgentTaskQueryFilters;
}

export interface AgentTaskTodayResponse {
  date: string;
  timezone: string;
  tasks: Task[];
  filters: {
    accountId: string | null;
    status: TaskStatus | null;
    limit: number;
  };
}

export interface AgentAdRecordQueryFilters {
  accountId: string | null;
  date: string | null;
  type: AdRecordType | null;
  settlementStatus: IncomeSettlement | null;
  limit: number;
}

export interface AgentAdRecordListResponse {
  records: AdRecord[];
  filters: AgentAdRecordQueryFilters;
}

export interface AgentAdRecordMonthlyRow {
  month: number;
  income: number;
  expense: number;
  settled: number;
  unsettled: number;
}

export interface AgentAdRecordMonthlyResponse {
  year: number;
  timezone: string;
  months: AgentAdRecordMonthlyRow[];
  totals: {
    income: number;
    expense: number;
    settled: number;
    unsettled: number;
  };
  filters: {
    accountId: string | null;
  };
}

export interface AgentAdRecordBatchItemInput {
  accountId: string;
  title: string;
  date: string;
  note?: string;
  type: AdRecordType;
  amount: number;
  settlementStatus?: IncomeSettlement | null;
}

export interface AgentAdRecordBatchInput {
  source: string;
  timezone?: string;
  rawText?: string;
  records: AgentAdRecordBatchItemInput[];
}

export interface AgentAdRecordBatchSkippedItem {
  index: number;
  reason: string;
}

export interface AgentAdRecordBatchResponse {
  requestId: string;
  created: AdRecord[];
  skipped: AgentAdRecordBatchSkippedItem[];
}
