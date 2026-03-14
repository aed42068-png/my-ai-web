---
name: mam-task
description: Use this skill when the user wants to create tasks in the mam.midao.site content dashboard from natural-language instructions about accounts, brands, dates, or publishing plans.
metadata: {"openclaw":{"requires":{"env":["MAM_AGENT_API_BASE_URL","MAM_AGENT_API_TOKEN"],"bins":["node"]},"primaryEnv":"MAM_AGENT_API_TOKEN","homepage":"https://mam.midao.site"}}
---

# MAM Task

Use this skill when the user wants to query accounts/tasks or add one or more tasks to the `mam.midao.site` dashboard from natural language.

Follow this workflow:

1. Extract the account name, brand names, action phrases, and dates from the user's message.
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
   - Only use `已拍` or `已发` when the user explicitly says the work is already complete
7. Before creating anything, inspect the target day's existing tasks when useful:

```bash
node {baseDir}/scripts/mam-task.mjs list-tasks --account-id "acc_travel" --date "2026-03-14" --limit 50
```

You can also inspect today's tasks:

```bash
node {baseDir}/scripts/mam-task.mjs list-today --account-id "acc_travel" --timezone "Asia/Shanghai" --limit 50
```

8. Build a JSON payload like this:

```json
{
  "source": "openclaw",
  "timezone": "Asia/Shanghai",
  "rawText": "年轻朋友阿甜账号今天接了三个广告……",
  "tasks": [
    {
      "accountId": "acc_xxx",
      "title": "豆包广告发布",
      "date": "2026-03-14",
      "status": "待拍",
      "location": "AI录入"
    }
  ]
}
```

9. Ask the script to check duplicates first when you want a read-only preview:

```bash
cat <<'JSON' | node {baseDir}/scripts/mam-task.mjs check-batch
{
  "source": "openclaw",
  "timezone": "Asia/Shanghai",
  "rawText": "年轻朋友阿甜账号今天接了三个广告……",
  "tasks": [
    {
      "accountId": "acc_xxx",
      "title": "豆包广告发布",
      "date": "2026-03-14",
      "status": "待拍",
      "location": "AI录入"
    }
  ]
}
JSON
```

10. Pipe the JSON into the bundled script to create tasks:

```bash
cat <<'JSON' | node {baseDir}/scripts/mam-task.mjs create-batch
{
  "source": "openclaw",
  "timezone": "Asia/Shanghai",
  "rawText": "年轻朋友阿甜账号今天接了三个广告……",
  "tasks": [
    {
      "accountId": "acc_xxx",
      "title": "豆包广告发布",
      "date": "2026-03-14",
      "status": "待拍",
      "location": "AI录入"
    }
  ]
}
JSON
```

The script automatically queries `/api/agent/tasks` and skips exact duplicates on the same account and date before writing.

11. Confirm how many tasks were created and briefly list them. If the script skipped duplicates, say that clearly instead of claiming everything was newly created.

Keep these constraints:

- Never create a new account automatically.
- Never write ad records in this skill.
- Keep the original user text in `rawText`.
- Prefer the bundled script over ad-hoc `curl` so auth headers, duplicate checks, and idempotency stay consistent.
