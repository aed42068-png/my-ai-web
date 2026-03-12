import type {
  Account,
  AccountInput,
  AdRecord,
  AdRecordInput,
  AdRecordPatch,
  Asset,
  Task,
  TaskInput,
  TaskPatch,
  TaskReviewInput,
  UploadSignature,
} from '../types';

interface UploadSignInput {
  filename: string;
  contentType: string;
  size: number;
  purpose: 'account-cover';
  entityType?: string;
  entityId?: string;
}

interface UploadCompleteInput {
  objectKey: string;
  contentType: string;
  size: number;
  purpose: 'account-cover';
  entityType?: string;
  entityId?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const fallback = `Request failed with status ${response.status}`;
    try {
      const data = (await response.json()) as unknown;
      throw new Error(extractErrorMessage(data) || fallback);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(fallback);
    }
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function extractErrorMessage(data: unknown): string | null {
  if (typeof data === 'string') {
    return data;
  }

  if (Array.isArray(data)) {
    const parts = data.map(extractErrorMessage).filter(Boolean);
    return parts.length ? parts.join('；') : null;
  }

  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;

    if (typeof record.error === 'string') {
      return record.error;
    }

    if (record.error) {
      const nestedError = extractErrorMessage(record.error);
      if (nestedError) {
        return nestedError;
      }
    }

    if (typeof record.message === 'string') {
      return record.message;
    }

    if (Array.isArray(record.issues)) {
      const issues = record.issues
        .map((issue) => {
          if (!issue || typeof issue !== 'object') {
            return null;
          }

          const typedIssue = issue as { message?: unknown; path?: unknown };
          if (typeof typedIssue.message !== 'string') {
            return null;
          }

          if (Array.isArray(typedIssue.path) && typedIssue.path.length) {
            return `${typedIssue.path.join('.')}: ${typedIssue.message}`;
          }

          return typedIssue.message;
        })
        .filter(Boolean);

      if (issues.length) {
        return issues.join('；');
      }
    }
  }

  return null;
}

export const api = {
  getAccounts: () => request<Account[]>('/api/accounts'),
  createAccount: (input: AccountInput) =>
    request<Account>('/api/accounts', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateAccount: (id: string, input: Partial<AccountInput>) =>
    request<Account>(`/api/accounts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  getTasks: () => request<Task[]>('/api/tasks'),
  createTask: (input: TaskInput) =>
    request<Task>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateTask: (id: string, input: TaskPatch) =>
    request<Task>(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  deleteTask: (id: string) =>
    request<void>(`/api/tasks/${id}`, {
      method: 'DELETE',
    }),
  saveTaskReview: (id: string, input: TaskReviewInput) =>
    request<Task>(`/api/tasks/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  getAdRecords: () => request<AdRecord[]>('/api/ad-records'),
  createAdRecord: (input: AdRecordInput) =>
    request<AdRecord>('/api/ad-records', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateAdRecord: (id: string, input: AdRecordPatch) =>
    request<AdRecord>(`/api/ad-records/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  deleteAdRecord: (id: string) =>
    request<void>(`/api/ad-records/${id}`, {
      method: 'DELETE',
    }),
  signUpload: (input: UploadSignInput) =>
    request<UploadSignature>('/api/uploads/sign', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  completeUpload: (input: UploadCompleteInput) =>
    request<{ asset: Asset }>('/api/uploads/complete', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
};

export async function uploadAsset(file: File, purpose: 'account-cover'): Promise<Asset> {
  const signature = await api.signUpload({
    filename: file.name,
    contentType: file.type || 'application/octet-stream',
    size: file.size,
    purpose,
  });

  const uploadResponse = await fetch(signature.uploadUrl, {
    method: 'PUT',
    headers: signature.headers,
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error(`Upload failed with status ${uploadResponse.status}`);
  }

  const completion = await retryCompleteUpload({
    objectKey: signature.objectKey,
    contentType: file.type || 'application/octet-stream',
    size: file.size,
    purpose,
  });

  return completion.asset;
}

async function retryCompleteUpload(input: UploadCompleteInput): Promise<{ asset: Asset }> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await api.completeUpload(input);
    } catch (error) {
      if (!(error instanceof Error) || !isRetryableUploadCompletionError(error) || attempt === 3) {
        throw error;
      }

      lastError = error;
      await sleep(200 * (attempt + 1));
    }
  }

  throw lastError ?? new Error('Upload completion failed');
}

function isRetryableUploadCompletionError(error: Error): boolean {
  return error.message.includes('Uploaded object not found') || error.message.includes('status 404');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
