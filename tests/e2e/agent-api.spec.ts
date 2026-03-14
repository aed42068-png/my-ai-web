import { expect, test } from '@playwright/test';
import { gotoHome, uniqueName } from './helpers';

const LOCAL_AGENT_TOKEN = 'dev-agent-token';

function buildAgentHeaders(idempotencyKey: string, token = LOCAL_AGENT_TOKEN) {
  return {
    Authorization: `Bearer ${token}`,
    'Idempotency-Key': idempotencyKey,
  };
}

function getTodayInTimeZone(timeZone: string) {
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
    throw new Error(`Unable to resolve date for timezone ${timeZone}`);
  }

  return `${year}-${month}-${day}`;
}

test('agent api: rejects missing and invalid bearer tokens', async ({ request }) => {
  const missingTokenResponse = await request.get('/api/agent/accounts/resolve?q=AI教程号');
  expect(missingTokenResponse.status()).toBe(401);
  await expect(missingTokenResponse.json()).resolves.toEqual({
    error: 'Missing Bearer token',
  });

  const invalidTokenResponse = await request.get('/api/agent/accounts/resolve?q=AI教程号', {
    headers: {
      Authorization: 'Bearer invalid-agent-token',
    },
  });
  expect(invalidTokenResponse.status()).toBe(403);
  await expect(invalidTokenResponse.json()).resolves.toEqual({
    error: 'Invalid agent token',
  });
});

test('agent api: resolves exact, not found, and ambiguous accounts', async ({ request }) => {
  const ambiguousBaseName = uniqueName('年轻朋友阿甜');
  const firstName = ambiguousBaseName;
  const secondName = `${ambiguousBaseName}账号`;

  await request.post('/api/accounts', {
    data: {
      name: firstName,
      coverImageUrl: 'https://example.com/agent-first.png',
    },
  });
  await request.post('/api/accounts', {
    data: {
      name: secondName,
      coverImageUrl: 'https://example.com/agent-second.png',
    },
  });

  const exactResponse = await request.get('/api/agent/accounts/resolve?q=AI 教程号', {
    headers: {
      Authorization: `Bearer ${LOCAL_AGENT_TOKEN}`,
    },
  });
  expect(exactResponse.status()).toBe(200);
  await expect(exactResponse.json()).resolves.toEqual({
    match: 'exact',
    account: {
      id: 'acc_ai',
      name: 'AI教程号',
    },
  });

  const notFoundResponse = await request.get('/api/agent/accounts/resolve?q=完全不存在的账号', {
    headers: {
      Authorization: `Bearer ${LOCAL_AGENT_TOKEN}`,
    },
  });
  expect(notFoundResponse.status()).toBe(200);
  await expect(notFoundResponse.json()).resolves.toEqual({
    match: 'not_found',
    candidates: [],
  });

  const ambiguousResponse = await request.get(`/api/agent/accounts/resolve?q=${encodeURIComponent(secondName)}`, {
    headers: {
      Authorization: `Bearer ${LOCAL_AGENT_TOKEN}`,
    },
  });
  expect(ambiguousResponse.status()).toBe(200);
  const ambiguousData = (await ambiguousResponse.json()) as {
    match: string;
    candidates: Array<{ id: string; name: string }>;
  };
  expect(ambiguousData.match).toBe('ambiguous');
  expect(ambiguousData.candidates.map((candidate) => candidate.name)).toEqual(expect.arrayContaining([firstName, secondName]));
});

test('agent api: batch creates tasks once and replays by idempotency key', async ({ request }) => {
  const idempotencyKey = uniqueName('agent-idempotency');
  const titles = [uniqueName('豆包广告发布'), uniqueName('可灵广告文案'), uniqueName('MiniMax广告发布')];
  const payload = {
    source: 'openclaw',
    timezone: 'Asia/Shanghai',
    rawText: '年轻朋友阿甜账号今天接了三个广告',
    tasks: [
      {
        accountId: 'acc_ai',
        title: titles[0],
        date: '2026-03-14',
        status: '待拍',
      },
      {
        accountId: 'acc_ai',
        title: titles[1],
        date: '2026-03-13',
        status: '待拍',
      },
      {
        accountId: 'acc_ai',
        title: titles[2],
        date: '2026-03-15',
        status: '待拍',
      },
    ],
  };

  const firstResponse = await request.post('/api/agent/tasks/batch', {
    headers: buildAgentHeaders(idempotencyKey),
    data: payload,
  });
  expect(firstResponse.status()).toBe(201);
  const firstData = (await firstResponse.json()) as {
    requestId: string;
    created: Array<{ id: string; title: string; location: string }>;
    skipped: unknown[];
  };
  expect(firstData.created).toHaveLength(3);
  expect(firstData.skipped).toEqual([]);
  expect(firstData.created.every((task) => task.location === 'AI录入')).toBe(true);

  const replayResponse = await request.post('/api/agent/tasks/batch', {
    headers: buildAgentHeaders(idempotencyKey),
    data: payload,
  });
  expect(replayResponse.status()).toBe(200);
  const replayData = (await replayResponse.json()) as typeof firstData;
  expect(replayData.requestId).toBe(firstData.requestId);
  expect(replayData.created.map((task) => task.id)).toEqual(firstData.created.map((task) => task.id));

  const tasksResponse = await request.get('/api/tasks');
  const tasks = (await tasksResponse.json()) as Array<{ title: string }>;
  for (const title of titles) {
    expect(tasks.filter((task) => task.title === title)).toHaveLength(1);
  }
});

test('agent api: lists accounts, filtered tasks, and today tasks', async ({ request }) => {
  const today = getTodayInTimeZone('Asia/Shanghai');
  const todayTaskTitle = uniqueName('Agent今日任务');
  const futureTaskTitle = uniqueName('Agent未来任务');

  const createResponse = await request.post('/api/agent/tasks/batch', {
    headers: buildAgentHeaders(uniqueName('agent-query')),
    data: {
      source: 'openclaw',
      timezone: 'Asia/Shanghai',
      rawText: '给年轻朋友阿甜创建两个任务',
      tasks: [
        {
          accountId: 'acc_travel',
          title: todayTaskTitle,
          date: today,
          status: '待拍',
        },
        {
          accountId: 'acc_travel',
          title: futureTaskTitle,
          date: '2026-03-31',
          status: '已拍',
        },
      ],
    },
  });
  expect(createResponse.status()).toBe(201);

  const accountsResponse = await request.get('/api/agent/accounts', {
    headers: {
      Authorization: `Bearer ${LOCAL_AGENT_TOKEN}`,
    },
  });
  expect(accountsResponse.status()).toBe(200);
  const accountsData = (await accountsResponse.json()) as {
    accounts: Array<{ id: string; name: string; sortOrder: number }>;
  };
  expect(accountsData.accounts.some((account) => account.id === 'acc_travel' && account.name === '旅行主账号')).toBe(true);

  const filteredTasksResponse = await request.get(
    `/api/agent/tasks?accountId=acc_travel&date=${today}&status=%E5%BE%85%E6%8B%8D&limit=10`,
    {
      headers: {
        Authorization: `Bearer ${LOCAL_AGENT_TOKEN}`,
      },
    }
  );
  expect(filteredTasksResponse.status()).toBe(200);
  const filteredTasksData = (await filteredTasksResponse.json()) as {
    tasks: Array<{ title: string; date: string; status: string; accountId: string }>;
    filters: { accountId: string | null; date: string | null; status: string | null; limit: number };
  };
  expect(filteredTasksData.filters).toEqual({
    accountId: 'acc_travel',
    date: today,
    status: '待拍',
    limit: 10,
  });
  expect(filteredTasksData.tasks.some((task) => task.title === todayTaskTitle)).toBe(true);
  expect(filteredTasksData.tasks.every((task) => task.accountId === 'acc_travel')).toBe(true);
  expect(filteredTasksData.tasks.every((task) => task.date === today)).toBe(true);
  expect(filteredTasksData.tasks.every((task) => task.status === '待拍')).toBe(true);

  const todayResponse = await request.get('/api/agent/tasks/today?accountId=acc_travel&limit=10', {
    headers: {
      Authorization: `Bearer ${LOCAL_AGENT_TOKEN}`,
    },
  });
  expect(todayResponse.status()).toBe(200);
  const todayData = (await todayResponse.json()) as {
    date: string;
    timezone: string;
    tasks: Array<{ title: string; date: string }>;
    filters: { accountId: string | null; status: string | null; limit: number };
  };
  expect(todayData.date).toBe(today);
  expect(todayData.timezone).toBe('Asia/Shanghai');
  expect(todayData.filters).toEqual({
    accountId: 'acc_travel',
    status: null,
    limit: 10,
  });
  expect(todayData.tasks.some((task) => task.title === todayTaskTitle)).toBe(true);
  expect(todayData.tasks.every((task) => task.date === today)).toBe(true);
  expect(todayData.tasks.some((task) => task.title === futureTaskTitle)).toBe(false);
});

test('agent api: batch creates ad records once and replays by idempotency key', async ({ request }) => {
  const idempotencyKey = uniqueName('agent-record-idempotency');
  const incomeTitle = uniqueName('Agent收入记录');
  const expenseTitle = uniqueName('Agent投放记录');
  const payload = {
    source: 'openclaw',
    timezone: 'Asia/Shanghai',
    rawText: '给旅行主账号记两笔收支',
    records: [
      {
        accountId: 'acc_travel',
        title: incomeTitle,
        date: '2026-03-14',
        note: '品牌季度合作回款',
        type: 'income',
        amount: 1888,
        settlementStatus: 'settled',
      },
      {
        accountId: 'acc_travel',
        title: expenseTitle,
        date: '2026-03-14',
        note: 'Dou+ 加热投放',
        type: 'expense',
        amount: 300,
      },
    ],
  };

  const firstResponse = await request.post('/api/agent/ad-records/batch', {
    headers: buildAgentHeaders(idempotencyKey),
    data: payload,
  });
  expect(firstResponse.status()).toBe(201);
  const firstData = (await firstResponse.json()) as {
    requestId: string;
    created: Array<{ id: string; title: string; type: string; note: string; settlementStatus: string | null }>;
    skipped: unknown[];
  };
  expect(firstData.created).toHaveLength(2);
  expect(firstData.skipped).toEqual([]);
  expect(firstData.created.some((record) => record.title === incomeTitle && record.settlementStatus === 'settled')).toBe(true);
  expect(firstData.created.some((record) => record.title === expenseTitle && record.type === 'expense' && record.note === 'Dou+ 加热投放')).toBe(true);

  const replayResponse = await request.post('/api/agent/ad-records/batch', {
    headers: buildAgentHeaders(idempotencyKey),
    data: payload,
  });
  expect(replayResponse.status()).toBe(200);
  const replayData = (await replayResponse.json()) as typeof firstData;
  expect(replayData.requestId).toBe(firstData.requestId);
  expect(replayData.created.map((record) => record.id)).toEqual(firstData.created.map((record) => record.id));

  const recordsResponse = await request.get('/api/ad-records');
  const records = (await recordsResponse.json()) as Array<{ title: string }>;
  expect(records.filter((record) => record.title === incomeTitle)).toHaveLength(1);
  expect(records.filter((record) => record.title === expenseTitle)).toHaveLength(1);
});

test('agent api: lists filtered ad records and monthly summary', async ({ request }) => {
  const incomeTitle = uniqueName('Agent查询收入');
  const expenseTitle = uniqueName('Agent查询投放');

  const createResponse = await request.post('/api/agent/ad-records/batch', {
    headers: buildAgentHeaders(uniqueName('agent-record-query')),
    data: {
      source: 'openclaw',
      timezone: 'Asia/Shanghai',
      rawText: '给旅行主账号记两笔 2026 年 3 月的记录',
      records: [
        {
          accountId: 'acc_travel',
          title: incomeTitle,
          date: '2026-03-20',
          note: '品牌回款',
          type: 'income',
          amount: 2600,
          settlementStatus: 'unsettled',
        },
        {
          accountId: 'acc_travel',
          title: expenseTitle,
          date: '2026-03-21',
          note: '广告投流',
          type: 'expense',
          amount: 420,
        },
      ],
    },
  });
  expect(createResponse.status()).toBe(201);

  const recordsResponse = await request.get(
    '/api/agent/ad-records?accountId=acc_travel&date=2026-03-20&type=income&settlementStatus=unsettled&limit=10',
    {
      headers: {
        Authorization: `Bearer ${LOCAL_AGENT_TOKEN}`,
      },
    }
  );
  expect(recordsResponse.status()).toBe(200);
  const recordsData = (await recordsResponse.json()) as {
    records: Array<{ title: string; accountId: string; type: string; settlementStatus: string | null; date: string }>;
    filters: {
      accountId: string | null;
      date: string | null;
      type: string | null;
      settlementStatus: string | null;
      limit: number;
    };
  };
  expect(recordsData.filters).toEqual({
    accountId: 'acc_travel',
    date: '2026-03-20',
    type: 'income',
    settlementStatus: 'unsettled',
    limit: 10,
  });
  expect(recordsData.records.some((record) => record.title === incomeTitle)).toBe(true);
  expect(recordsData.records.every((record) => record.accountId === 'acc_travel')).toBe(true);
  expect(recordsData.records.every((record) => record.date === '2026-03-20')).toBe(true);
  expect(recordsData.records.every((record) => record.type === 'income')).toBe(true);
  expect(recordsData.records.every((record) => record.settlementStatus === 'unsettled')).toBe(true);

  const monthlyResponse = await request.get('/api/agent/ad-records/monthly?accountId=acc_travel&year=2026', {
    headers: {
      Authorization: `Bearer ${LOCAL_AGENT_TOKEN}`,
    },
  });
  expect(monthlyResponse.status()).toBe(200);
  const monthlyData = (await monthlyResponse.json()) as {
    year: number;
    timezone: string;
    months: Array<{ month: number; income: number; expense: number; settled: number; unsettled: number }>;
    totals: { income: number; expense: number; settled: number; unsettled: number };
    filters: { accountId: string | null };
  };
  expect(monthlyData.year).toBe(2026);
  expect(monthlyData.timezone).toBe('Asia/Shanghai');
  expect(monthlyData.filters).toEqual({
    accountId: 'acc_travel',
  });
  const marchSummary = monthlyData.months.find((row) => row.month === 3);
  expect(marchSummary).toBeDefined();
  expect((marchSummary?.income ?? 0) >= 2600).toBe(true);
  expect((marchSummary?.expense ?? 0) >= 420).toBe(true);
  expect((marchSummary?.unsettled ?? 0) >= 2600).toBe(true);
});

test('agent api: invalid batch payload returns 422', async ({ request }) => {
  const response = await request.post('/api/agent/tasks/batch', {
    headers: buildAgentHeaders(uniqueName('agent-invalid')),
    data: {
      source: 'openclaw',
      timezone: 'Asia/Shanghai',
      tasks: [
        {
          accountId: 'acc_ai',
          title: '',
          date: '2026-03-14',
          status: '进行中',
        },
      ],
    },
  });

  expect(response.status()).toBe(422);
  const data = (await response.json()) as {
    error: string;
    issues: Array<{ path: string; message: string }>;
  };
  expect(data.error).toBe('Invalid request body');
  expect(data.issues.some((issue) => issue.path === 'tasks.0.title')).toBe(true);
});

test('agent api: invalid ad-record batch payload returns 422', async ({ request }) => {
  const response = await request.post('/api/agent/ad-records/batch', {
    headers: buildAgentHeaders(uniqueName('agent-record-invalid')),
    data: {
      source: 'openclaw',
      timezone: 'Asia/Shanghai',
      records: [
        {
          accountId: 'acc_travel',
          title: '',
          date: '2026-03-14',
          type: 'cost',
          amount: -10,
        },
      ],
    },
  });

  expect(response.status()).toBe(422);
  const data = (await response.json()) as {
    error: string;
    issues: Array<{ path: string; message: string }>;
  };
  expect(data.error).toBe('Invalid request body');
  expect(data.issues.some((issue) => issue.path === 'records.0.title')).toBe(true);
});

test('agent api: page picks up agent-created tasks on focus refresh without full reload', async ({ page, request }) => {
  const taskName = uniqueName('Agent同步任务');

  await gotoHome(page);
  await expect(page.getByTestId('home-active-account-name')).toHaveText('旅行主账号');
  await expect(page.getByText(taskName)).toHaveCount(0);

  const response = await request.post('/api/agent/tasks/batch', {
    headers: buildAgentHeaders(uniqueName('agent-focus')),
    data: {
      source: 'openclaw',
      timezone: 'Asia/Shanghai',
      rawText: '旅行主账号今天新增一个 AI 任务',
      tasks: [
        {
          accountId: 'acc_travel',
          title: taskName,
          date: '2026-03-13',
          status: '待拍',
        },
      ],
    },
  });

  expect(response.status()).toBe(201);

  await page.evaluate(() => {
    window.dispatchEvent(new Event('focus'));
  });

  await expect(page.getByText(taskName)).toBeVisible();
});

test('agent api: ads page picks up agent-created ad records on focus refresh without full reload', async ({ page, request }) => {
  const recordTitle = uniqueName('Agent同步收入');

  await gotoHome(page);
  await page.getByTestId('tab-ads').click();
  await expect(page.getByRole('heading', { name: '收益管理' })).toBeVisible();
  await expect(page.getByText(recordTitle)).toHaveCount(0);

  const response = await request.post('/api/agent/ad-records/batch', {
    headers: buildAgentHeaders(uniqueName('agent-record-focus')),
    data: {
      source: 'openclaw',
      timezone: 'Asia/Shanghai',
      rawText: '给旅行主账号记一笔投放',
      records: [
        {
          accountId: 'acc_travel',
          title: recordTitle,
          date: '2026-03-14',
          note: 'Agent 自动录入',
          type: 'income',
          amount: 256,
          settlementStatus: 'unsettled',
        },
      ],
    },
  });

  expect(response.status()).toBe(201);

  await page.evaluate(() => {
    window.dispatchEvent(new Event('focus'));
  });

  await expect(page.getByText(recordTitle)).toBeVisible();
});
