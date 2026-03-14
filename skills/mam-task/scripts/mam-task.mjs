#!/usr/bin/env node

import { createHash } from 'node:crypto';
import process from 'node:process';

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--help' || command === '-h') {
  printHelp();
  process.exit(command ? 0 : 1);
}

const baseUrl = resolveBaseUrl();
const token = process.env.MAM_AGENT_API_TOKEN?.trim();

if (!token) {
  exitWithError('MAM_AGENT_API_TOKEN is required');
}

try {
  if (command === 'list-accounts') {
    const response = await agentRequest('/api/agent/accounts', {
      headers: buildAuthHeaders(),
    });

    process.stdout.write(`${JSON.stringify(response, null, 2)}\n`);
    process.exit(0);
  }

  if (command === 'resolve-account') {
    const query = args[1]?.trim();
    if (!query) {
      exitWithError('resolve-account requires a query string');
    }

    const response = await agentRequest(`/api/agent/accounts/resolve?q=${encodeURIComponent(query)}`, {
      headers: buildAuthHeaders(),
    });

    process.stdout.write(`${JSON.stringify(response, null, 2)}\n`);
    process.exit(0);
  }

  if (command === 'list-tasks') {
    const response = await agentRequest(buildTaskListPath('/api/agent/tasks'), {
      headers: buildAuthHeaders(),
    });

    process.stdout.write(`${JSON.stringify(response, null, 2)}\n`);
    process.exit(0);
  }

  if (command === 'list-today') {
    const response = await agentRequest(buildTodayTaskPath('/api/agent/tasks/today'), {
      headers: buildAuthHeaders(),
    });

    process.stdout.write(`${JSON.stringify(response, null, 2)}\n`);
    process.exit(0);
  }

  if (command === 'list-ad-records') {
    const response = await agentRequest(buildAdRecordListPath('/api/agent/ad-records'), {
      headers: buildAuthHeaders(),
    });

    process.stdout.write(`${JSON.stringify(response, null, 2)}\n`);
    process.exit(0);
  }

  if (command === 'list-ad-records-monthly') {
    const response = await agentRequest(buildAdRecordMonthlyPath('/api/agent/ad-records/monthly'), {
      headers: buildAuthHeaders(),
    });

    process.stdout.write(`${JSON.stringify(response, null, 2)}\n`);
    process.exit(0);
  }

  if (command === 'check-batch' || command === 'create-batch') {
    const idempotencyKey = readOption('--idempotency-key');
    const allowDuplicates = hasFlag('--allow-duplicates');
    const dryRun = command === 'check-batch' || hasFlag('--dry-run');
    const rawPayload = await readStdin();
    if (!rawPayload.trim()) {
      exitWithError(`${command} expects a JSON payload on stdin`);
    }

    let payload;
    try {
      payload = JSON.parse(rawPayload);
    } catch {
      exitWithError('stdin must be valid JSON');
    }

    const batchPayload = assertTaskBatchPayload(payload);
    const duplicateCheck = allowDuplicates ? buildNoopDuplicateCheck(batchPayload) : await inspectBatchDuplicates(batchPayload);

    if (dryRun) {
      process.stdout.write(
        `${JSON.stringify(
          {
            dryRun: true,
            duplicateCheck,
          },
          null,
          2
        )}\n`
      );
      process.exit(0);
    }

    if (!duplicateCheck.toCreate.length) {
      process.stdout.write(
        `${JSON.stringify(
          {
            dryRun: false,
            idempotencyKey: null,
            requestId: null,
            created: [],
            skipped: duplicateCheck.duplicates,
            duplicateCheck,
          },
          null,
          2
        )}\n`
      );
      process.exit(0);
    }

    const effectivePayload = {
      ...batchPayload,
      tasks: duplicateCheck.toCreate.map(({ task }) => task),
    };
    const effectiveIdempotencyKey = idempotencyKey || buildIdempotencyKey(JSON.stringify(effectivePayload));
    const response = await agentRequest('/api/agent/tasks/batch', {
      method: 'POST',
      headers: {
        ...buildAuthHeaders(),
        'Content-Type': 'application/json',
        'Idempotency-Key': effectiveIdempotencyKey,
      },
      body: JSON.stringify(effectivePayload),
    });

    process.stdout.write(
      `${JSON.stringify(
        {
          dryRun: false,
          idempotencyKey: effectiveIdempotencyKey,
          duplicateCheck,
          skipped: duplicateCheck.duplicates,
          ...response,
        },
        null,
        2
      )}\n`
    );
    process.exit(0);
  }

  if (command === 'check-ad-records-batch' || command === 'create-ad-records-batch') {
    const idempotencyKey = readOption('--idempotency-key');
    const allowDuplicates = hasFlag('--allow-duplicates');
    const dryRun = command === 'check-ad-records-batch' || hasFlag('--dry-run');
    const rawPayload = await readStdin();
    if (!rawPayload.trim()) {
      exitWithError(`${command} expects a JSON payload on stdin`);
    }

    let payload;
    try {
      payload = JSON.parse(rawPayload);
    } catch {
      exitWithError('stdin must be valid JSON');
    }

    const batchPayload = assertAdRecordBatchPayload(payload);
    const duplicateCheck = allowDuplicates
      ? buildNoopAdRecordDuplicateCheck(batchPayload)
      : await inspectAdRecordBatchDuplicates(batchPayload);

    if (dryRun) {
      process.stdout.write(
        `${JSON.stringify(
          {
            dryRun: true,
            duplicateCheck,
          },
          null,
          2
        )}\n`
      );
      process.exit(0);
    }

    if (!duplicateCheck.toCreate.length) {
      process.stdout.write(
        `${JSON.stringify(
          {
            dryRun: false,
            idempotencyKey: null,
            requestId: null,
            created: [],
            skipped: duplicateCheck.duplicates,
            duplicateCheck,
          },
          null,
          2
        )}\n`
      );
      process.exit(0);
    }

    const effectivePayload = {
      ...batchPayload,
      records: duplicateCheck.toCreate.map(({ record }) => record),
    };
    const effectiveIdempotencyKey = idempotencyKey || buildIdempotencyKey(JSON.stringify(effectivePayload));
    const response = await agentRequest('/api/agent/ad-records/batch', {
      method: 'POST',
      headers: {
        ...buildAuthHeaders(),
        'Content-Type': 'application/json',
        'Idempotency-Key': effectiveIdempotencyKey,
      },
      body: JSON.stringify(effectivePayload),
    });

    process.stdout.write(
      `${JSON.stringify(
        {
          dryRun: false,
          idempotencyKey: effectiveIdempotencyKey,
          duplicateCheck,
          skipped: duplicateCheck.duplicates,
          ...response,
        },
        null,
        2
      )}\n`
    );
    process.exit(0);
  }

  exitWithError(`Unknown command: ${command}`);
} catch (error) {
  if (error instanceof Error) {
    exitWithError(error.message);
  }

  exitWithError('Unknown error');
}

function resolveBaseUrl() {
  return (process.env.MAM_AGENT_API_BASE_URL?.trim() || 'https://mam.midao.site').replace(/\/$/, '');
}

function buildAuthHeaders() {
  return {
    Authorization: `Bearer ${token}`,
  };
}

function readOption(flag) {
  const index = args.indexOf(flag);
  if (index === -1) {
    return '';
  }

  return args[index + 1]?.trim() || '';
}

function buildIdempotencyKey(rawPayload) {
  return `openclaw-${createHash('sha256').update(rawPayload).digest('hex').slice(0, 24)}`;
}

function hasFlag(flag) {
  return args.includes(flag);
}

function buildTaskListPath(basePath) {
  const query = new URLSearchParams();
  appendOption(query, 'accountId', readOption('--account-id'));
  appendOption(query, 'date', readOption('--date'));
  appendOption(query, 'status', readOption('--status'));
  appendOption(query, 'limit', readOption('--limit'));
  const suffix = query.toString();
  return suffix ? `${basePath}?${suffix}` : basePath;
}

function buildTodayTaskPath(basePath) {
  const query = new URLSearchParams();
  appendOption(query, 'accountId', readOption('--account-id'));
  appendOption(query, 'status', readOption('--status'));
  appendOption(query, 'timezone', readOption('--timezone'));
  appendOption(query, 'limit', readOption('--limit'));
  const suffix = query.toString();
  return suffix ? `${basePath}?${suffix}` : basePath;
}

function buildAdRecordListPath(basePath) {
  const query = new URLSearchParams();
  appendOption(query, 'accountId', readOption('--account-id'));
  appendOption(query, 'date', readOption('--date'));
  appendOption(query, 'type', readOption('--type'));
  appendOption(query, 'settlementStatus', readOption('--settlement-status'));
  appendOption(query, 'limit', readOption('--limit'));
  const suffix = query.toString();
  return suffix ? `${basePath}?${suffix}` : basePath;
}

function buildAdRecordMonthlyPath(basePath) {
  const query = new URLSearchParams();
  appendOption(query, 'accountId', readOption('--account-id'));
  appendOption(query, 'year', readOption('--year'));
  appendOption(query, 'timezone', readOption('--timezone'));
  const suffix = query.toString();
  return suffix ? `${basePath}?${suffix}` : basePath;
}

function appendOption(query, key, value) {
  if (value) {
    query.set(key, value);
  }
}

async function agentRequest(path, init) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  const data = text ? safeParseJson(text) : null;

  if (!response.ok) {
    throw new Error(extractErrorMessage(data) || `Request failed with status ${response.status}`);
  }

  return data;
}

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractErrorMessage(data) {
  if (!data) {
    return null;
  }

  if (typeof data === 'string') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(extractErrorMessage).filter(Boolean).join('；') || null;
  }

  if (typeof data === 'object') {
    if (typeof data.error === 'string') {
      return data.error;
    }

    if (Array.isArray(data.issues)) {
      const issues = data.issues
        .map((issue) => {
          if (!issue || typeof issue !== 'object') {
            return null;
          }

          if (typeof issue.path === 'string' && typeof issue.message === 'string') {
            return `${issue.path}: ${issue.message}`;
          }

          return typeof issue.message === 'string' ? issue.message : null;
        })
        .filter(Boolean);

      if (issues.length) {
        return issues.join('；');
      }
    }
  }

  return null;
}

async function inspectBatchDuplicates(batchPayload) {
  const groupedTasks = new Map();
  for (const [index, task] of batchPayload.tasks.entries()) {
    const groupKey = `${task.accountId}__${task.date}`;
    const group = groupedTasks.get(groupKey) || [];
    group.push({ index, task });
    groupedTasks.set(groupKey, group);
  }

  const duplicateEntries = [];
  const toCreate = [];

  for (const [groupKey, entries] of groupedTasks.entries()) {
    const [accountId, date] = groupKey.split('__');
    const path = `/api/agent/tasks?accountId=${encodeURIComponent(accountId)}&date=${encodeURIComponent(date)}&limit=100`;
    const response = await agentRequest(path, {
      headers: buildAuthHeaders(),
    });
    const existingTasks = Array.isArray(response?.tasks) ? response.tasks : [];

    const seenTitles = new Map();
    for (const task of existingTasks) {
      seenTitles.set(normalizeTaskTitle(task.title), task);
    }

    for (const entry of entries) {
      const normalizedTitle = normalizeTaskTitle(entry.task.title);
      const matchedTask = seenTitles.get(normalizedTitle);
      if (matchedTask) {
        duplicateEntries.push({
          index: entry.index,
          reason: 'Duplicate task already exists on the same account and date',
          task: entry.task,
          existingTask: {
            id: matchedTask.id,
            title: matchedTask.title,
            date: matchedTask.date,
            status: matchedTask.status,
            accountId: matchedTask.accountId,
          },
        });
        continue;
      }

      toCreate.push(entry);
      seenTitles.set(normalizedTitle, entry.task);
    }
  }

  return {
    inputCount: batchPayload.tasks.length,
    submittedCount: toCreate.length,
    duplicateCount: duplicateEntries.length,
    toCreate,
    duplicates: duplicateEntries,
  };
}

function buildNoopDuplicateCheck(batchPayload) {
  return {
    inputCount: batchPayload.tasks.length,
    submittedCount: batchPayload.tasks.length,
    duplicateCount: 0,
    toCreate: batchPayload.tasks.map((task, index) => ({ index, task })),
    duplicates: [],
  };
}

async function inspectAdRecordBatchDuplicates(batchPayload) {
  const groupedRecords = new Map();
  for (const [index, record] of batchPayload.records.entries()) {
    const groupKey = `${record.accountId}__${record.date}`;
    const group = groupedRecords.get(groupKey) || [];
    group.push({ index, record });
    groupedRecords.set(groupKey, group);
  }

  const duplicateEntries = [];
  const toCreate = [];

  for (const [groupKey, entries] of groupedRecords.entries()) {
    const [accountId, date] = groupKey.split('__');
    const path = `/api/agent/ad-records?accountId=${encodeURIComponent(accountId)}&date=${encodeURIComponent(date)}&limit=100`;
    const response = await agentRequest(path, {
      headers: buildAuthHeaders(),
    });
    const existingRecords = Array.isArray(response?.records) ? response.records : [];

    const seenKeys = new Map();
    for (const record of existingRecords) {
      seenKeys.set(buildAdRecordDedupKey(record), record);
    }

    for (const entry of entries) {
      const dedupKey = buildAdRecordDedupKey(entry.record);
      const matchedRecord = seenKeys.get(dedupKey);
      if (matchedRecord) {
        duplicateEntries.push({
          index: entry.index,
          reason: 'Duplicate ad record already exists on the same account and date',
          record: entry.record,
          existingRecord: {
            id: matchedRecord.id,
            title: matchedRecord.title,
            date: matchedRecord.date,
            type: matchedRecord.type,
            amount: matchedRecord.amount,
            accountId: matchedRecord.accountId,
          },
        });
        continue;
      }

      toCreate.push(entry);
      seenKeys.set(dedupKey, entry.record);
    }
  }

  return {
    inputCount: batchPayload.records.length,
    submittedCount: toCreate.length,
    duplicateCount: duplicateEntries.length,
    toCreate,
    duplicates: duplicateEntries,
  };
}

function buildNoopAdRecordDuplicateCheck(batchPayload) {
  return {
    inputCount: batchPayload.records.length,
    submittedCount: batchPayload.records.length,
    duplicateCount: 0,
    toCreate: batchPayload.records.map((record, index) => ({ index, record })),
    duplicates: [],
  };
}

function assertTaskBatchPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    exitWithError('batch payload must be a JSON object');
  }

  if (!Array.isArray(payload.tasks)) {
    exitWithError('batch payload must include a tasks array');
  }

  return payload;
}

function assertAdRecordBatchPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    exitWithError('batch payload must be a JSON object');
  }

  if (!Array.isArray(payload.records)) {
    exitWithError('batch payload must include a records array');
  }

  return payload;
}

function normalizeTaskTitle(value) {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function buildAdRecordDedupKey(record) {
  const normalizedTitle = normalizeTaskTitle(record.title);
  const normalizedType = String(record.type || '').trim().toLowerCase();
  const normalizedAmount = Number(record.amount || 0).toFixed(2);
  return `${normalizedTitle}__${normalizedType}__${normalizedAmount}`;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function printHelp() {
  process.stdout.write(`mam-task

Commands:
  list-accounts
  resolve-account "<account name>"
  list-tasks [--account-id "<id>"] [--date "YYYY-MM-DD"] [--status "待拍"] [--limit "20"]
  list-today [--account-id "<id>"] [--status "待拍"] [--timezone "Asia/Shanghai"] [--limit "20"]
  list-ad-records [--account-id "<id>"] [--date "YYYY-MM-DD"] [--type "income"] [--settlement-status "settled"] [--limit "20"]
  list-ad-records-monthly [--account-id "<id>"] [--year "2026"] [--timezone "Asia/Shanghai"]
  check-batch < payload.json
  create-batch [--idempotency-key "<key>"] [--allow-duplicates] [--dry-run] < payload.json
  check-ad-records-batch < payload.json
  create-ad-records-batch [--idempotency-key "<key>"] [--allow-duplicates] [--dry-run] < payload.json

Environment:
  MAM_AGENT_API_BASE_URL   Default: https://mam.midao.site
  MAM_AGENT_API_TOKEN      Required Bearer token for /api/agent/*
`);
}

function exitWithError(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
