import { AwsClient } from 'aws4fetch';
import { zValidator } from '@hono/zod-validator';
import { Context, Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import type {
  Account,
  AgentAccountListResponse,
  AgentAccountResolveResponse,
  AgentResolvedAccount,
  AgentTaskBatchInput,
  AgentTaskBatchResponse,
  AgentTaskListResponse,
  AgentTaskQueryFilters,
  AgentTaskTodayResponse,
  AdRecord,
  Asset,
  HitStatus,
  Task,
  TaskInput,
  TaskStatus,
} from '../src/types';

type AppBindings = {
  DB: D1Database;
  BUCKET: R2Bucket;
  ASSETS: Fetcher;
  R2_ACCOUNT_ID: string;
  R2_BUCKET_NAME: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_PUBLIC_BASE_URL?: string;
  AGENT_API_TOKEN?: string;
};

type AppContext = {
  Bindings: AppBindings;
};

type AccountRow = {
  id: string;
  name: string;
  cover_asset_id: string | null;
  cover_image_url: string;
  cover_offset_y: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type TaskRow = {
  id: string;
  account_id: string;
  title: string;
  date: string;
  location: string;
  status: TaskStatus;
  sort_order: number;
  hit_status: HitStatus;
  review_data: string | null;
  created_at: string;
  updated_at: string;
};

type AdRecordRow = {
  id: string;
  account_id: string;
  title: string;
  date: string;
  note: string;
  type: 'income' | 'expense';
  amount: number;
  settlement_status: 'settled' | 'unsettled' | null;
  created_at: string;
  updated_at: string;
};

type AssetRow = {
  id: string;
  object_key: string;
  url: string;
  mime_type: string;
  size: number;
  purpose: 'account-cover';
  status: 'ready' | 'pending';
  owner_entity_type: string | null;
  owner_entity_id: string | null;
  created_at: string;
};

type AgentRequestRow = {
  id: string;
  source: string;
  idempotency_key: string;
  raw_text: string | null;
  request_body: string;
  result_body: string | null;
  status: string;
  created_at: string;
};

const taskStatusSchema = z.enum(['已拍', '待拍', '已发']);
const hitStatusSchema = z.enum(['爆款', '小爆款']).nullable();
const recordTypeSchema = z.enum(['income', 'expense']);
const settlementSchema = z.enum(['settled', 'unsettled']).nullable();

const accountSchema = z.object({
  name: z.string().trim().min(1).max(80),
  coverAssetId: z.string().trim().min(1).nullable().optional(),
  coverImageUrl: z.string().trim().min(1),
  coverOffsetY: z.number().int().min(0).max(100).default(50),
  sortOrder: z.number().int().min(0).optional(),
});

const taskSchema = z.object({
  accountId: z.string().trim().min(1),
  title: z.string().trim().min(1).max(160),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  location: z.string().trim().max(80).default('未指定'),
  status: taskStatusSchema,
  sortOrder: z.number().int().min(0).optional(),
});

const taskPatchSchema = taskSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one task field is required'
);

const reviewSchema = z.object({
  hitStatus: hitStatusSchema,
  reviewData: z.string().max(4000).default(''),
});

const adRecordSchema = z.object({
  accountId: z.string().trim().min(1),
  title: z.string().trim().min(1).max(160),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(2000).default(''),
  type: recordTypeSchema,
  amount: z.number().positive(),
  settlementStatus: settlementSchema.optional(),
});

const adRecordPatchSchema = adRecordSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one ad record field is required'
);

const uploadPurposeSchema = z.enum(['account-cover']);
const agentResolveQuerySchema = z.object({
  q: z.string().trim().min(1).max(80),
});
const agentTaskListQuerySchema = z.object({
  accountId: z.string().trim().min(1).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: taskStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
const agentTaskTodayQuerySchema = z.object({
  accountId: z.string().trim().min(1).optional(),
  status: taskStatusSchema.optional(),
  timezone: z.string().trim().min(1).max(60).default('Asia/Shanghai'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
const agentTaskItemSchema = z.object({
  accountId: z.string().trim().min(1),
  title: z.string().trim().min(1).max(160),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: taskStatusSchema,
  location: z.string().trim().max(80).optional(),
});
const agentTaskBatchSchema = z.object({
  source: z.string().trim().min(1).max(40),
  timezone: z.string().trim().min(1).max(60).default('Asia/Shanghai'),
  rawText: z.string().trim().max(4000).optional(),
  tasks: z.array(agentTaskItemSchema).min(1).max(20),
});
const LOCAL_AGENT_TEST_TOKEN = 'dev-agent-token';
const DEFAULT_AGENT_TASK_LOCATION = 'AI录入';

const uploadSignSchema = z.object({
  filename: z.string().trim().min(1).max(240),
  contentType: z.string().trim().min(1).max(120).refine((value) => value.startsWith('image/'), 'Only image uploads are supported'),
  size: z.number().int().positive().max(10 * 1024 * 1024),
  purpose: uploadPurposeSchema,
  entityType: z.string().trim().min(1).optional(),
  entityId: z.string().trim().min(1).optional(),
});

const uploadCompleteSchema = z.object({
  objectKey: z.string().trim().min(1),
  contentType: z.string().trim().min(1),
  size: z.number().int().positive(),
  purpose: uploadPurposeSchema,
  entityType: z.string().trim().min(1).optional(),
  entityId: z.string().trim().min(1).optional(),
});

const app = new Hono<AppContext>();

app.onError((error, c) => {
  console.error(error);
  if (error instanceof HTTPException) {
    return c.json({ error: error.message }, error.status);
  }
  return c.json({ error: error.message || 'Internal Server Error' }, 500);
});

function getAcceptedAgentTokens(env: AppBindings, hostname: string): string[] {
  const tokens = [env.AGENT_API_TOKEN?.trim()].filter(Boolean) as string[];

  if (isLocalDevelopmentHost(hostname)) {
    tokens.push(LOCAL_AGENT_TEST_TOKEN);
  }

  return [...new Set(tokens)];
}

function isLocalDevelopmentHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '[::1]' ||
    hostname.endsWith('.local')
  );
}

app.use('/api/agent/*', async (c, next) => {
  const authHeader = c.req.header('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing Bearer token' }, 401);
  }

  const token = authHeader.slice('Bearer '.length).trim();
  const acceptedTokens = getAcceptedAgentTokens(c.env, new URL(c.req.url).hostname);
  if (!acceptedTokens.length) {
    return c.json({ error: 'Agent API token is not configured' }, 500);
  }

  if (!acceptedTokens.includes(token)) {
    return c.json({ error: 'Invalid agent token' }, 403);
  }

  await next();
});

app.get('/api/health', (c) => c.json({ ok: true }));

app.get('/api/agent/accounts', async (c) => {
  const accounts = await listAgentAccounts(c.env.DB);
  return c.json({
    accounts,
  } satisfies AgentAccountListResponse);
});

app.get('/api/agent/accounts/resolve', async (c) => {
  const parsed = agentResolveQuerySchema.safeParse({
    q: c.req.query('q'),
  });

  if (!parsed.success) {
    return c.json(
      {
        error: 'Invalid query',
        issues: parsed.error.issues.map(({ path, message }) => ({
          path: path.join('.'),
          message,
        })),
      },
      422
    );
  }

  const normalizedQuery = normalizeAccountName(parsed.data.q);
  const accounts = await listResolvableAccounts(c.env.DB);
  const matches = accounts.filter((account) => normalizeAccountName(account.name) === normalizedQuery);

  if (!matches.length) {
    return c.json({
      match: 'not_found',
      candidates: [],
    } satisfies AgentAccountResolveResponse);
  }

  if (matches.length === 1) {
    return c.json({
      match: 'exact',
      account: matches[0],
    } satisfies AgentAccountResolveResponse);
  }

  return c.json({
    match: 'ambiguous',
    candidates: matches,
  } satisfies AgentAccountResolveResponse);
});

app.get('/api/agent/tasks', async (c) => {
  const parsed = agentTaskListQuerySchema.safeParse({
    accountId: c.req.query('accountId'),
    date: c.req.query('date'),
    status: c.req.query('status'),
    limit: c.req.query('limit'),
  });

  if (!parsed.success) {
    return c.json(
      {
        error: 'Invalid query',
        issues: parsed.error.issues.map(({ path, message }) => ({
          path: path.join('.'),
          message,
        })),
      },
      422
    );
  }

  const filters: AgentTaskQueryFilters = {
    accountId: parsed.data.accountId ?? null,
    date: parsed.data.date ?? null,
    status: parsed.data.status ?? null,
    limit: parsed.data.limit,
  };

  const tasks = await listTasks(c.env.DB, filters);
  return c.json({
    tasks,
    filters,
  } satisfies AgentTaskListResponse);
});

app.get('/api/agent/tasks/today', async (c) => {
  const parsed = agentTaskTodayQuerySchema.safeParse({
    accountId: c.req.query('accountId'),
    status: c.req.query('status'),
    timezone: c.req.query('timezone'),
    limit: c.req.query('limit'),
  });

  if (!parsed.success) {
    return c.json(
      {
        error: 'Invalid query',
        issues: parsed.error.issues.map(({ path, message }) => ({
          path: path.join('.'),
          message,
        })),
      },
      422
    );
  }

  let today: string;
  try {
    today = getDateInTimeZone(parsed.data.timezone);
  } catch {
    return c.json(
      {
        error: 'Invalid query',
        issues: [
          {
            path: 'timezone',
            message: 'Invalid timezone',
          },
        ],
      },
      422
    );
  }

  const filters: AgentTaskQueryFilters = {
    accountId: parsed.data.accountId ?? null,
    date: today,
    status: parsed.data.status ?? null,
    limit: parsed.data.limit,
  };

  const tasks = await listTasks(c.env.DB, filters);
  return c.json({
    date: today,
    timezone: parsed.data.timezone,
    tasks,
    filters: {
      accountId: filters.accountId,
      status: filters.status,
      limit: filters.limit,
    },
  } satisfies AgentTaskTodayResponse);
});

app.get('/api/accounts', async (c) => {
  const accounts = await listAccounts(c.env.DB);
  return c.json(accounts);
});

app.post('/api/accounts', zValidator('json', accountSchema), async (c) => {
  const input = c.req.valid('json');
  await assertAccountExists(c.env.DB, input.coverAssetId ?? null, false);

  const id = createId('acc');
  const now = nowIso();
  const sortOrder = input.sortOrder ?? (await nextSortOrder(c.env.DB, 'accounts'));

  await c.env.DB.prepare(
    `INSERT INTO accounts (id, name, cover_asset_id, cover_image_url, cover_offset_y, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(id, input.name, input.coverAssetId ?? null, input.coverImageUrl, input.coverOffsetY, sortOrder, now, now)
    .run();

  if (input.coverAssetId) {
    await attachAsset(c.env.DB, input.coverAssetId, 'account', id);
  }

  return c.json(
    {
      id,
      name: input.name,
      coverAssetId: input.coverAssetId ?? null,
      coverImageUrl: input.coverImageUrl,
      coverOffsetY: input.coverOffsetY,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    } satisfies Account,
    201
  );
});

app.patch('/api/accounts/:id', zValidator('json', accountSchema.partial()), async (c) => {
  const existing = await getAccountById(c.env.DB, c.req.param('id'));
  if (!existing) {
    return c.json({ error: 'Account not found' }, 404);
  }

  const input = c.req.valid('json');
  await assertAccountExists(c.env.DB, input.coverAssetId ?? existing.coverAssetId, false);

  const updated: Account = {
    ...existing,
    name: input.name ?? existing.name,
    coverAssetId: input.coverAssetId ?? existing.coverAssetId,
    coverImageUrl: input.coverImageUrl ?? existing.coverImageUrl,
    coverOffsetY: input.coverOffsetY ?? existing.coverOffsetY,
    sortOrder: input.sortOrder ?? existing.sortOrder,
    updatedAt: nowIso(),
  };

  await c.env.DB.prepare(
    `UPDATE accounts
     SET name = ?, cover_asset_id = ?, cover_image_url = ?, cover_offset_y = ?, sort_order = ?, updated_at = ?
     WHERE id = ?`
  )
    .bind(
      updated.name,
      updated.coverAssetId,
      updated.coverImageUrl,
      updated.coverOffsetY,
      updated.sortOrder,
      updated.updatedAt,
      updated.id
    )
    .run();

  if (updated.coverAssetId) {
    await attachAsset(c.env.DB, updated.coverAssetId, 'account', updated.id);
  }

  return c.json(updated);
});

app.get('/api/tasks', async (c) => {
  const tasks = await listTasks(c.env.DB);
  return c.json(tasks);
});

app.post('/api/tasks', zValidator('json', taskSchema), async (c) => {
  const input = c.req.valid('json');
  const account = await getAccountById(c.env.DB, input.accountId);
  if (!account) {
    return c.json({ error: 'Account not found' }, 404);
  }

  const created = await createTaskRecord(c.env.DB, input);
  return c.json(created, 201);
});

app.patch('/api/tasks/:id', zValidator('json', taskPatchSchema), async (c) => {
  const existing = await getTaskById(c.env.DB, c.req.param('id'));
  if (!existing) {
    return c.json({ error: 'Task not found' }, 404);
  }

  const input = c.req.valid('json');
  if (input.accountId) {
    const account = await getAccountById(c.env.DB, input.accountId);
    if (!account) {
      return c.json({ error: 'Account not found' }, 404);
    }
  }

  const statusChanged = input.status && input.status !== existing.status;
  const accountChanged = input.accountId && input.accountId !== existing.accountId;
  const targetAccountId = input.accountId ?? existing.accountId;
  const targetStatus = input.status ?? existing.status;
  const nextSort =
    input.sortOrder ??
    ((statusChanged || accountChanged)
      ? await nextSortOrder(c.env.DB, 'tasks', `WHERE account_id = ? AND status = ?`, [targetAccountId, targetStatus])
      : existing.sortOrder);

  const updated: Task = {
    ...existing,
    accountId: targetAccountId,
    title: input.title ?? existing.title,
    date: input.date ?? existing.date,
    location: input.location ?? existing.location,
    status: targetStatus,
    sortOrder: nextSort,
    updatedAt: nowIso(),
  };

  await c.env.DB.prepare(
    `UPDATE tasks
     SET account_id = ?, title = ?, date = ?, location = ?, status = ?, sort_order = ?, updated_at = ?
     WHERE id = ?`
  )
    .bind(
      updated.accountId,
      updated.title,
      updated.date,
      updated.location,
      updated.status,
      updated.sortOrder,
      updated.updatedAt,
      updated.id
    )
    .run();

  return c.json(updated);
});

app.delete('/api/tasks/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM task_reviews WHERE task_id = ?').bind(id).run();
  await c.env.DB.prepare('DELETE FROM tasks WHERE id = ?').bind(id).run();
  return c.body(null, 204);
});

app.post('/api/tasks/:id/review', zValidator('json', reviewSchema), async (c) => {
  const existing = await getTaskById(c.env.DB, c.req.param('id'));
  if (!existing) {
    return c.json({ error: 'Task not found' }, 404);
  }

  const input = c.req.valid('json');
  const now = nowIso();

  await c.env.DB.prepare(
    `INSERT INTO task_reviews (task_id, hit_status, review_data, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(task_id) DO UPDATE SET
       hit_status = excluded.hit_status,
       review_data = excluded.review_data,
       updated_at = excluded.updated_at`
  )
    .bind(existing.id, input.hitStatus, input.reviewData, now, now)
    .run();

  return c.json({
    ...existing,
    hitStatus: input.hitStatus,
    reviewData: input.reviewData,
  } satisfies Task);
});

app.post('/api/agent/tasks/batch', async (c) => {
  const idempotencyKey = c.req.header('idempotency-key')?.trim();
  if (!idempotencyKey) {
    return c.json({ error: 'Idempotency-Key header is required' }, 400);
  }

  const rawBody = await c.req.text();
  if (!rawBody.trim()) {
    return c.json({ error: 'Request body is required' }, 422);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 422);
  }

  const parsed = agentTaskBatchSchema.safeParse(payload);
  if (!parsed.success) {
    return c.json(
      {
        error: 'Invalid request body',
        issues: parsed.error.issues.map(({ path, message }) => ({
          path: path.join('.'),
          message,
        })),
      },
      422
    );
  }

  const input: AgentTaskBatchInput = parsed.data;
  const reserved = await reserveAgentRequest(c.env.DB, {
    id: createId('agentreq'),
    source: input.source,
    idempotencyKey,
    rawText: input.rawText ?? null,
    requestBody: JSON.stringify(input),
  });

  if (reserved.status === 'existing') {
    return replayAgentRequest(c, reserved.row);
  }

  const requestId = reserved.row.id;

  try {
    const accountIssues = await findMissingTaskAccountIssues(c.env.DB, input.tasks);
    if (accountIssues.length) {
      const payload = {
        error: 'Invalid request body',
        issues: accountIssues,
      };
      await finalizeAgentRequest(c.env.DB, requestId, 'failed', payload);
      return c.json(payload, 422);
    }

    const created: Task[] = [];
    for (const taskInput of input.tasks) {
      created.push(
        await createTaskRecord(c.env.DB, {
          ...taskInput,
          location: taskInput.location?.trim() || DEFAULT_AGENT_TASK_LOCATION,
        })
      );
    }

    const response = {
      requestId,
      created,
      skipped: [],
    } satisfies AgentTaskBatchResponse;

    await finalizeAgentRequest(c.env.DB, requestId, 'succeeded', response);
    return c.json(response, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create agent tasks';
    await finalizeAgentRequest(c.env.DB, requestId, 'failed', {
      error: message,
    });
    throw error;
  }
});

app.get('/api/ad-records', async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT id, account_id, title, date, note, type, amount, settlement_status, created_at, updated_at
     FROM ad_records
     ORDER BY date DESC, created_at DESC`
  ).all<AdRecordRow>();

  return c.json(result.results.map(mapAdRecord));
});

app.post('/api/ad-records', zValidator('json', adRecordSchema), async (c) => {
  const input = c.req.valid('json');
  const account = await getAccountById(c.env.DB, input.accountId);
  if (!account) {
    return c.json({ error: 'Account not found' }, 404);
  }

  const id = createId('record');
  const now = nowIso();

  await c.env.DB.prepare(
    `INSERT INTO ad_records (id, account_id, title, date, note, type, amount, settlement_status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      input.accountId,
      input.title,
      input.date,
      input.note,
      input.type,
      input.amount,
      input.settlementStatus ?? null,
      now,
      now
    )
    .run();

  return c.json(
    {
      id,
      accountId: input.accountId,
      title: input.title,
      date: input.date,
      note: input.note,
      type: input.type,
      amount: input.amount,
      settlementStatus: input.settlementStatus ?? null,
      createdAt: now,
      updatedAt: now,
    } satisfies AdRecord,
    201
  );
});

app.patch('/api/ad-records/:id', zValidator('json', adRecordPatchSchema), async (c) => {
  const existing = await getAdRecordById(c.env.DB, c.req.param('id'));
  if (!existing) {
    return c.json({ error: 'Ad record not found' }, 404);
  }

  const input = c.req.valid('json');
  if (input.accountId) {
    const account = await getAccountById(c.env.DB, input.accountId);
    if (!account) {
      return c.json({ error: 'Account not found' }, 404);
    }
  }

  const nextType = input.type ?? existing.type;
  const updated: AdRecord = {
    ...existing,
    accountId: input.accountId ?? existing.accountId,
    title: input.title ?? existing.title,
    date: input.date ?? existing.date,
    note: input.note ?? existing.note,
    type: nextType,
    amount: input.amount ?? existing.amount,
    settlementStatus: nextType === 'income' ? (input.settlementStatus ?? existing.settlementStatus) : null,
    updatedAt: nowIso(),
  };

  await c.env.DB.prepare(
    `UPDATE ad_records
     SET account_id = ?, title = ?, date = ?, note = ?, type = ?, amount = ?, settlement_status = ?, updated_at = ?
     WHERE id = ?`
  )
    .bind(
      updated.accountId,
      updated.title,
      updated.date,
      updated.note,
      updated.type,
      updated.amount,
      updated.type === 'income' ? updated.settlementStatus : null,
      updated.updatedAt,
      updated.id
    )
    .run();

  return c.json(updated);
});

app.delete('/api/ad-records/:id', async (c) => {
  const result = await c.env.DB.prepare('DELETE FROM ad_records WHERE id = ?').bind(c.req.param('id')).run();
  if (!result.meta.changes) {
    return c.json({ error: 'Ad record not found' }, 404);
  }

  return c.body(null, 204);
});

app.post('/api/uploads/sign', zValidator('json', uploadSignSchema), async (c) => {
  const input = c.req.valid('json');
  assertR2SigningEnv(c.env);

  const objectKey = buildObjectKey(input.purpose, input.filename);
  const expiresInSeconds = 900;
  const resourceUrl = new URL(
    `https://${c.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${c.env.R2_BUCKET_NAME}/${objectKey}`
  );
  resourceUrl.searchParams.set('X-Amz-Expires', String(expiresInSeconds));

  const signer = new AwsClient({
    accessKeyId: c.env.R2_ACCESS_KEY_ID,
    secretAccessKey: c.env.R2_SECRET_ACCESS_KEY,
  });

  const signedRequest = await signer.sign(
    new Request(resourceUrl.toString(), {
      method: 'PUT',
      headers: {
        'Content-Type': input.contentType,
      },
    }),
    {
      aws: {
        service: 's3',
        region: 'auto',
        signQuery: true,
      },
    }
  );

  return c.json({
    uploadUrl: signedRequest.url,
    objectKey,
    headers: {
      'Content-Type': input.contentType,
    },
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
  });
});

app.post('/api/uploads/complete', zValidator('json', uploadCompleteSchema), async (c) => {
  const input = c.req.valid('json');

  const existing = await getAssetByKey(c.env.DB, input.objectKey);
  if (existing) {
    return c.json({ asset: existing });
  }

  const objectMeta = await resolveUploadedObjectMeta(c.env, input.objectKey);
  if (!objectMeta) {
    return c.json({ error: 'Uploaded object not found' }, 404);
  }

  const asset: Asset = {
    id: createId('asset'),
    key: input.objectKey,
    url: buildAssetUrl(c.req.url, c.env, input.objectKey),
    mimeType: objectMeta.contentType || input.contentType,
    size: objectMeta.size || input.size,
    purpose: input.purpose,
    status: 'ready',
    ownerEntityType: input.entityType ?? null,
    ownerEntityId: input.entityId ?? null,
    createdAt: nowIso(),
  };

  await c.env.DB.prepare(
    `INSERT INTO assets (id, object_key, url, mime_type, size, purpose, status, owner_entity_type, owner_entity_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      asset.id,
      asset.key,
      asset.url,
      asset.mimeType,
      asset.size,
      asset.purpose,
      asset.status,
      asset.ownerEntityType,
      asset.ownerEntityId,
      asset.createdAt
    )
    .run();

  return c.json({ asset }, 201);
});

app.get('/api/assets/*', async (c) => {
  const key = decodeURIComponent(c.req.path.replace('/api/assets/', ''));
  if (!key) {
    return c.json({ error: 'Asset key is required' }, 400);
  }

  const object = await c.env.BUCKET.get(key);
  if (!object) {
    return c.json({ error: 'Asset not found' }, 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'public, max-age=3600');
  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/octet-stream');
  }

  return new Response(object.body, {
    headers,
  });
});

app.notFound((c) => c.json({ error: 'Not found' }, 404));

export default {
  fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<AppBindings>;

async function getAccountById(db: D1Database, id: string): Promise<Account | null> {
  const result = await db.prepare(
    `SELECT id, name, cover_asset_id, cover_image_url, cover_offset_y, sort_order, created_at, updated_at
     FROM accounts
     WHERE id = ?`
  )
    .bind(id)
    .first<AccountRow>();

  return result ? mapAccount(result) : null;
}

async function listResolvableAccounts(db: D1Database): Promise<AgentResolvedAccount[]> {
  const result = await db.prepare(
    `SELECT id, name
     FROM accounts
     ORDER BY sort_order ASC, created_at ASC`
  ).all<Pick<AccountRow, 'id' | 'name'>>();

  return result.results.map((row) => ({
    id: row.id,
    name: row.name,
  }));
}

async function listAccounts(db: D1Database): Promise<Account[]> {
  const result = await db.prepare(
    `SELECT id, name, cover_asset_id, cover_image_url, cover_offset_y, sort_order, created_at, updated_at
     FROM accounts
     ORDER BY sort_order ASC, created_at ASC`
  ).all<AccountRow>();

  return result.results.map(mapAccount);
}

async function listAgentAccounts(db: D1Database): Promise<AgentAccountListResponse['accounts']> {
  const result = await db.prepare(
    `SELECT id, name, sort_order, updated_at
     FROM accounts
     ORDER BY sort_order ASC, created_at ASC`
  ).all<Pick<AccountRow, 'id' | 'name' | 'sort_order' | 'updated_at'>>();

  return result.results.map((row) => ({
    id: row.id,
    name: row.name,
    sortOrder: Number(row.sort_order),
    updatedAt: row.updated_at,
  }));
}

async function getTaskById(db: D1Database, id: string): Promise<Task | null> {
  const result = await db.prepare(
    `SELECT
        tasks.id,
        tasks.account_id,
        tasks.title,
        tasks.date,
        tasks.location,
        tasks.status,
        tasks.sort_order,
        task_reviews.hit_status,
        task_reviews.review_data,
        tasks.created_at,
        tasks.updated_at
     FROM tasks
     LEFT JOIN task_reviews ON task_reviews.task_id = tasks.id
     WHERE tasks.id = ?`
  )
    .bind(id)
    .first<TaskRow>();

  return result ? mapTask(result) : null;
}

async function getAssetByKey(db: D1Database, key: string): Promise<Asset | null> {
  const result = await db.prepare(
    `SELECT id, object_key, url, mime_type, size, purpose, status, owner_entity_type, owner_entity_id, created_at
     FROM assets
     WHERE object_key = ?`
  )
    .bind(key)
    .first<AssetRow>();

  return result ? mapAsset(result) : null;
}

async function getAdRecordById(db: D1Database, id: string): Promise<AdRecord | null> {
  const result = await db.prepare(
    `SELECT id, account_id, title, date, note, type, amount, settlement_status, created_at, updated_at
     FROM ad_records
     WHERE id = ?`
  )
    .bind(id)
    .first<AdRecordRow>();

  return result ? mapAdRecord(result) : null;
}

async function getAgentRequestByIdempotencyKey(db: D1Database, idempotencyKey: string): Promise<AgentRequestRow | null> {
  const result = await db.prepare(
    `SELECT id, source, idempotency_key, raw_text, request_body, result_body, status, created_at
     FROM agent_requests
     WHERE idempotency_key = ?`
  )
    .bind(idempotencyKey)
    .first<AgentRequestRow>();

  return result ?? null;
}

async function nextSortOrder(
  db: D1Database,
  table: 'accounts' | 'tasks',
  clause = '',
  params: unknown[] = []
): Promise<number> {
  const result = await db.prepare(
    `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort_order FROM ${table} ${clause}`
  )
    .bind(...params)
    .first<{ next_sort_order: number }>();

  return Number(result?.next_sort_order ?? 0);
}

async function listTasks(
  db: D1Database,
  filters: Partial<AgentTaskQueryFilters> = {}
): Promise<Task[]> {
  const whereClauses: string[] = [];
  const params: Array<string | number> = [];

  if (filters.accountId) {
    whereClauses.push('tasks.account_id = ?');
    params.push(filters.accountId);
  }

  if (filters.date) {
    whereClauses.push('tasks.date = ?');
    params.push(filters.date);
  }

  if (filters.status) {
    whereClauses.push('tasks.status = ?');
    params.push(filters.status);
  }

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const limitSql = typeof filters.limit === 'number' ? '\n       LIMIT ?' : '';

  const result = await db
    .prepare(
      `SELECT
          tasks.id,
          tasks.account_id,
          tasks.title,
          tasks.date,
          tasks.location,
          tasks.status,
          tasks.sort_order,
          task_reviews.hit_status,
          task_reviews.review_data,
          tasks.created_at,
          tasks.updated_at
       FROM tasks
       LEFT JOIN task_reviews ON task_reviews.task_id = tasks.id
       ${whereSql}
       ORDER BY tasks.date DESC,
                CASE tasks.status WHEN '待拍' THEN 0 WHEN '已拍' THEN 1 ELSE 2 END,
                tasks.sort_order ASC,
                tasks.created_at DESC${limitSql}`
    )
    .bind(...(typeof filters.limit === 'number' ? [...params, filters.limit] : params))
    .all<TaskRow>();

  return result.results.map(mapTask);
}

async function createTaskRecord(db: D1Database, input: TaskInput): Promise<Task> {
  const id = createId('task');
  const now = nowIso();
  const location = input.location?.trim() || '未指定';
  const sortOrder =
    input.sortOrder ??
    (await nextSortOrder(db, 'tasks', `WHERE account_id = ? AND status = ?`, [input.accountId, input.status]));

  await db
    .prepare(
      `INSERT INTO tasks (id, account_id, title, date, location, status, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(id, input.accountId, input.title, input.date, location, input.status, sortOrder, now, now)
    .run();

  return {
    id,
    accountId: input.accountId,
    title: input.title,
    date: input.date,
    location,
    status: input.status,
    sortOrder,
    hitStatus: null,
    reviewData: '',
    createdAt: now,
    updatedAt: now,
  };
}

async function findMissingTaskAccountIssues(
  db: D1Database,
  tasks: AgentTaskBatchInput['tasks']
): Promise<Array<{ path: string; message: string }>> {
  const presenceByAccountId = new Map<string, boolean>();
  const issues: Array<{ path: string; message: string }> = [];

  for (const [index, task] of tasks.entries()) {
    if (!presenceByAccountId.has(task.accountId)) {
      presenceByAccountId.set(task.accountId, Boolean(await getAccountById(db, task.accountId)));
    }

    if (!presenceByAccountId.get(task.accountId)) {
      issues.push({
        path: `tasks.${index}.accountId`,
        message: 'Account not found',
      });
    }
  }

  return issues;
}

async function reserveAgentRequest(
  db: D1Database,
  input: {
    id: string;
    source: string;
    idempotencyKey: string;
    rawText: string | null;
    requestBody: string;
  }
): Promise<
  | {
      status: 'created';
      row: AgentRequestRow;
    }
  | {
      status: 'existing';
      row: AgentRequestRow;
    }
> {
  const createdAt = nowIso();

  try {
    await db
      .prepare(
        `INSERT INTO agent_requests (id, source, idempotency_key, raw_text, request_body, result_body, status, created_at)
         VALUES (?, ?, ?, ?, ?, NULL, 'processing', ?)`
      )
      .bind(input.id, input.source, input.idempotencyKey, input.rawText, input.requestBody, createdAt)
      .run();

    return {
      status: 'created',
      row: {
        id: input.id,
        source: input.source,
        idempotency_key: input.idempotencyKey,
        raw_text: input.rawText,
        request_body: input.requestBody,
        result_body: null,
        status: 'processing',
        created_at: createdAt,
      },
    };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const existing = await getAgentRequestByIdempotencyKey(db, input.idempotencyKey);
      if (existing) {
        return {
          status: 'existing',
          row: existing,
        };
      }
    }

    throw error;
  }
}

async function finalizeAgentRequest(
  db: D1Database,
  requestId: string,
  status: 'succeeded' | 'failed',
  result: unknown
): Promise<void> {
  await db
    .prepare(
      `UPDATE agent_requests
       SET status = ?, result_body = ?
       WHERE id = ?`
    )
    .bind(status, JSON.stringify(result), requestId)
    .run();
}

function replayAgentRequest(c: Context<AppContext>, row: AgentRequestRow) {
  if (row.status === 'succeeded' && row.result_body) {
    try {
      return c.json(JSON.parse(row.result_body) as AgentTaskBatchResponse, 200);
    } catch {
      return c.json({ error: 'Stored agent response is invalid', requestId: row.id }, 500);
    }
  }

  if (row.status === 'failed') {
    return c.json({ error: 'Idempotency key has already been used for a failed request', requestId: row.id }, 409);
  }

  return c.json({ error: 'Agent request is already processing', requestId: row.id }, 409);
}

async function attachAsset(
  db: D1Database,
  assetId: string,
  ownerEntityType: string,
  ownerEntityId: string
): Promise<void> {
  await db.prepare(
    `UPDATE assets
     SET owner_entity_type = ?, owner_entity_id = ?
     WHERE id = ?`
  )
    .bind(ownerEntityType, ownerEntityId, assetId)
    .run();
}

async function assertAccountExists(
  db: D1Database,
  assetId: string | null,
  required: boolean
): Promise<void> {
  if (!assetId) {
    if (required) {
      throw new Error('Asset is required');
    }
    return;
  }

  const existing = await db.prepare('SELECT id FROM assets WHERE id = ?').bind(assetId).first<{ id: string }>();
  if (!existing) {
    throw new Error('Asset not found');
  }
}

function mapAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    coverAssetId: row.cover_asset_id,
    coverImageUrl: row.cover_image_url,
    coverOffsetY: Number(row.cover_offset_y),
    sortOrder: Number(row.sort_order),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    accountId: row.account_id,
    title: row.title,
    date: row.date,
    location: row.location,
    status: row.status,
    sortOrder: Number(row.sort_order),
    hitStatus: row.hit_status ?? null,
    reviewData: row.review_data ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAdRecord(row: AdRecordRow): AdRecord {
  return {
    id: row.id,
    accountId: row.account_id,
    title: row.title,
    date: row.date,
    note: row.note,
    type: row.type,
    amount: Number(row.amount),
    settlementStatus: row.settlement_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAsset(row: AssetRow): Asset {
  return {
    id: row.id,
    key: row.object_key,
    url: row.url,
    mimeType: row.mime_type,
    size: Number(row.size),
    purpose: row.purpose,
    status: row.status,
    ownerEntityType: row.owner_entity_type,
    ownerEntityId: row.owner_entity_id,
    createdAt: row.created_at,
  };
}

function normalizeAccountName(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, '')
    .toLowerCase()
    .replace(/(账号|账户|帐户|帳號)$/u, '');
}

function getDateInTimeZone(timeZone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new Error(`Unable to resolve date for timezone: ${timeZone}`);
  }

  return `${year}-${month}-${day}`;
}

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function buildObjectKey(purpose: string, filename: string): string {
  const safeName = filename
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'upload';

  const dateSegment = new Date().toISOString().slice(0, 10);
  return `uploads/${purpose}/${dateSegment}/${crypto.randomUUID()}-${safeName}`;
}

function buildAssetUrl(requestUrl: string, env: AppBindings, key: string): string {
  if (env.R2_PUBLIC_BASE_URL) {
    return `${env.R2_PUBLIC_BASE_URL.replace(/\/$/, '')}/${key}`;
  }

  const url = new URL(requestUrl);
  return `${url.origin}/api/assets/${key}`;
}

function assertR2SigningEnv(env: AppBindings): void {
  if (!env.R2_ACCOUNT_ID || !env.R2_BUCKET_NAME || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
    throw new Error('R2 signing environment is incomplete');
  }
}

async function waitForObject(bucket: R2Bucket, key: string): Promise<R2Object | null> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const object = await bucket.head(key);
    if (object) {
      return object;
    }

    if (attempt < 4) {
      await delay(150 * (attempt + 1));
    }
  }

  return null;
}

async function resolveUploadedObjectMeta(
  env: AppBindings,
  key: string
): Promise<{ contentType: string | null; size: number | null } | null> {
  const object = await waitForObject(env.BUCKET, key);
  if (object) {
    return {
      contentType: object.httpMetadata?.contentType ?? null,
      size: object.size ?? null,
    };
  }

  if (!hasR2SigningEnv(env)) {
    return null;
  }

  return headRemoteObject(env, key);
}

async function headRemoteObject(
  env: AppBindings,
  key: string
): Promise<{ contentType: string | null; size: number | null } | null> {
  const signer = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  });
  const resourceUrl = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET_NAME}/${key}`;
  const signedRequest = await signer.sign(new Request(resourceUrl, { method: 'HEAD' }), {
    aws: {
      service: 's3',
      region: 'auto',
    },
  });

  const response = await fetch(signedRequest);
  if (!response.ok) {
    return null;
  }

  return {
    contentType: response.headers.get('content-type'),
    size: Number(response.headers.get('content-length') || 0) || null,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function hasR2SigningEnv(env: AppBindings): boolean {
  return Boolean(env.R2_ACCOUNT_ID && env.R2_BUCKET_NAME && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY);
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Error && /UNIQUE|unique constraint/i.test(error.message);
}
