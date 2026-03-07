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
