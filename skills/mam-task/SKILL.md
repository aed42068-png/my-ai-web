---
name: mam-task
description: Use this skill when the user wants to create tasks or ad records in the mam.midao.site content dashboard from natural-language instructions about accounts, brands, dates, notes, publishing plans, income, or spend.
metadata: {"openclaw":{"requires":{"env":["MAM_AGENT_API_BASE_URL","MAM_AGENT_API_TOKEN"],"bins":["node"]},"primaryEnv":"MAM_AGENT_API_TOKEN","homepage":"https://mam.midao.site"}}
---

# MAM Task

Use this skill when the user wants to query accounts/tasks/ad records or add one or more tasks or ad records to the `mam.midao.site` dashboard from natural language.

Follow this workflow:

1. Extract the account name, brand names, action phrases, dates, amount, settlement intent, and any note-like phrases from the user's message.
2. If needed, inspect the available accounts first:

```bash
node {baseDir}/scripts/mam-task.mjs list-accounts
```

3. Resolve the account:

```bash
node {baseDir}/scripts/mam-task.mjs resolve-account "年轻朋友阿甜"
```

4. If the response is `not_found` or `ambiguous`, stop and ask a follow-up question. Do not create tasks.
5. Convert relative dates like “今天 / 明天 / 后天” into absolute `YYYY-MM-DD` dates in the `Asia/Shanghai` timezone.
6. Map natural language into structured tasks:
   - “明天发 / 后天发” -> title `<品牌>广告发布`, status `待拍`
   - “今天出文案” -> title `<品牌>广告文案`, status `待拍`
   - “备注 / 说明 / 补充说明 / 备注：xxx / 说明是 xxx” -> task note
   - Only use `已拍` or `已发` when the user explicitly says the work is already complete
   - If the user provides note-like text, write it into the payload field `location`
   - If the user does not provide note-like text, use the default value `AI录入`
   - Do not interpret “备注” as a geographic location; `location` is the current legacy API field name that semantically stores the task note
7. Map natural language into structured ad records when the user is recording income or spend:
   - “投放 / 花了 / 支出 / 投流 / Dou+ / 广告费” -> `type = expense`
   - “收入 / 回款 / 结算 / 收到 / 到账” -> `type = income`
   - `amount` is required for ad records
   - If the user provides “备注 / 说明 / 补充说明”, write it into the payload field `note`
   - For income records, only set `settlementStatus = settled` when the user explicitly says it is settled; otherwise prefer `unsettled`
8. Before creating anything, inspect the target day's existing tasks when useful:
```bash
node {baseDir}/scripts/mam-task.mjs list-tasks --account-id "acc_travel" --date "2026-03-14" --limit 50
```

You can also inspect today's tasks:

```bash
node {baseDir}/scripts/mam-task.mjs list-today --account-id "acc_travel" --timezone "Asia/Shanghai" --limit 50
```

9. Inspect ad records when the user is talking about income or投放:

```bash
node {baseDir}/scripts/mam-task.mjs list-ad-records --account-id "acc_travel" --date "2026-03-14" --type "expense" --limit 50
node {baseDir}/scripts/mam-task.mjs list-ad-records-monthly --account-id "acc_travel" --year "2026"
```

10. Build a task JSON payload like this:

```json
{
  "source": "openclaw",
  "timezone": "Asia/Shanghai",
  "rawText": "年轻朋友阿甜明天发豆包广告，备注：先出一版轻口播",
  "tasks": [
    {
      "accountId": "acc_xxx",
      "title": "豆包广告发布",
      "date": "2026-03-14",
      "status": "待拍",
      "location": "先出一版轻口播"
    }
  ]
}
```

`location` 是当前接口里的历史字段名，语义上代表任务备注。

11. Ask the script to check task duplicates first when you want a read-only preview:

```bash
cat <<'JSON' | node {baseDir}/scripts/mam-task.mjs check-batch
{
  "source": "openclaw",
  "timezone": "Asia/Shanghai",
  "rawText": "年轻朋友阿甜明天发豆包广告，备注：先出一版轻口播",
  "tasks": [
    {
      "accountId": "acc_xxx",
      "title": "豆包广告发布",
      "date": "2026-03-14",
      "status": "待拍",
      "location": "先出一版轻口播"
    }
  ]
}
JSON
```

12. Pipe the JSON into the bundled script to create tasks:

```bash
cat <<'JSON' | node {baseDir}/scripts/mam-task.mjs create-batch
{
  "source": "openclaw",
  "timezone": "Asia/Shanghai",
  "rawText": "年轻朋友阿甜明天发豆包广告，备注：先出一版轻口播",
  "tasks": [
    {
      "accountId": "acc_xxx",
      "title": "豆包广告发布",
      "date": "2026-03-14",
      "status": "待拍",
      "location": "先出一版轻口播"
    }
  ]
}
JSON
```

The script automatically queries `/api/agent/tasks` and skips exact duplicates on the same account and date before writing.

13. Build an ad-record JSON payload like this when the user is recording spend or income:

```json
{
  "source": "openclaw",
  "timezone": "Asia/Shanghai",
  "rawText": "年轻朋友阿甜今天投了 300 元豆包广告，备注：先跑冷启动",
  "records": [
    {
      "accountId": "acc_xxx",
      "title": "豆包广告投放",
      "date": "2026-03-14",
      "type": "expense",
      "amount": 300,
      "note": "先跑冷启动"
    }
  ]
}
```

14. Ask the script to check ad-record duplicates first when you want a read-only preview:

```bash
cat <<'JSON' | node {baseDir}/scripts/mam-task.mjs check-ad-records-batch
{
  "source": "openclaw",
  "timezone": "Asia/Shanghai",
  "rawText": "年轻朋友阿甜今天投了 300 元豆包广告，备注：先跑冷启动",
  "records": [
    {
      "accountId": "acc_xxx",
      "title": "豆包广告投放",
      "date": "2026-03-14",
      "type": "expense",
      "amount": 300,
      "note": "先跑冷启动"
    }
  ]
}
JSON
```

15. Pipe the JSON into the bundled script to create ad records:

```bash
cat <<'JSON' | node {baseDir}/scripts/mam-task.mjs create-ad-records-batch
{
  "source": "openclaw",
  "timezone": "Asia/Shanghai",
  "rawText": "年轻朋友阿甜今天投了 300 元豆包广告，备注：先跑冷启动",
  "records": [
    {
      "accountId": "acc_xxx",
      "title": "豆包广告投放",
      "date": "2026-03-14",
      "type": "expense",
      "amount": 300,
      "note": "先跑冷启动"
    }
  ]
}
JSON
```

The script automatically queries `/api/agent/ad-records` and skips exact duplicates on the same account and date before writing.

16. Confirm how many tasks or ad records were created and briefly list them. If the script skipped duplicates, say that clearly instead of claiming everything was newly created.

Keep these constraints:

- Never create a new account automatically.
- When the user says “备注 / 说明 / 补充说明”, map it to the payload field `location`.
- When the user is recording income or spend, use the `records` payload and the `note` field instead of task `location`.
- Keep the original user text in `rawText`.
- Prefer the bundled script over ad-hoc `curl` so auth headers, duplicate checks, and idempotency stay consistent.
