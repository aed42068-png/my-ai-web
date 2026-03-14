# Agent API

## 1. 目标

这份文档定义当前仓库对外开放给 OpenClaw / skills / 其他 AI agent 的账号查询、任务查询和任务写入接口。

这层接口的定位不是替代网页端 CRUD，而是：

- 让外部 AI 先查询账号和任务，再把自然语言解析后的结构化结果写入任务
- 让网页端继续负责展示、提醒和手动修正
- 把公网 Bearer token、幂等、防重和审计隔离在单独的 `agent` 命名空间下

## 2. 当前边界

第一版已经锁定这些约束：

- 开放 **账号查询 / 任务查询 / 任务创建**
- 不自动创建账号
- 不自动写 `ad_records`
- 自然语言解析放在 **OpenClaw / skill** 侧，不放到 Worker
- Worker 只接收结构化请求，不直接做 LLM 语义理解
- 信息不完整时，由 skill 追问；Worker 不做“猜测式补全”

## 3. 接口概览

当前实现的对外接口：

- `GET /api/agent/accounts`
- `GET /api/agent/accounts/resolve`
- `GET /api/agent/tasks`
- `GET /api/agent/tasks/today`
- `POST /api/agent/tasks/batch`

当前网页内部仍继续使用：

- `/api/accounts`
- `/api/tasks`
- `/api/ad-records`

不要把这两层接口混用。公网 AI 写入走 `/api/agent/*`，浏览器端继续走原来的站内 API。

## 4. 鉴权

### 4.1 生产

生产环境使用 Worker secret：

- `AGENT_API_TOKEN`

请求头格式：

```http
Authorization: Bearer <AGENT_API_TOKEN>
```

### 4.2 本地开发和 E2E

为了让本地调试和 Playwright 集成测试不依赖真实 secret，Worker 在 **localhost / 127.0.0.1 / 0.0.0.0 / *.local** 下额外接受一个固定开发 token：

```text
dev-agent-token
```

这个 fallback 只用于本地环境，不应在生产文档或外部集成里使用。

### 4.3 Token 生成建议

推荐生成一个随机的 32-byte hex token：

```bash
openssl rand -hex 32
```

生成后按这个顺序使用：

1. 本地 `.dev.vars`

```dotenv
AGENT_API_TOKEN="生成出来的值"
```

2. 生产 Worker secret

```bash
printf '%s' '生成出来的值' | npx wrangler secret put AGENT_API_TOKEN
```

3. OpenClaw skill env

- `MAM_AGENT_API_TOKEN`

不要把这个 token：

- 写进 `wrangler.jsonc`
- 写进仓库
- 写进 skill prompt
- 写进公开日志

## 5. 账号列表接口

### 5.1 请求

```http
GET /api/agent/accounts
Authorization: Bearer <token>
```

### 5.2 返回示例

```json
{
  "accounts": [
    {
      "id": "acc_travel",
      "name": "年轻朋友阿甜",
      "sortOrder": 1,
      "updatedAt": "2026-03-13T09:05:03.767Z"
    }
  ]
}
```

用途：

- 让 skill 先知道当前有哪些账号
- 在 resolve 失败时提供候选背景

## 6. 账号解析接口

### 6.1 请求

```http
GET /api/agent/accounts/resolve?q=年轻朋友阿甜
Authorization: Bearer <token>
```

### 6.2 行为

- 先做标准化精确匹配
- 标准化规则：
  - `NFKC` 归一化
  - 去首尾空格
  - 去中间空白
  - 拉丁字符转小写
  - 去掉一个尾部后缀：`账号 / 账户 / 帐户 / 帳號`
- 命中 1 个返回 `exact`
- 命中 0 个返回 `not_found`
- 命中多个返回 `ambiguous`

### 6.3 返回示例

精确命中：

```json
{
  "match": "exact",
  "account": {
    "id": "acc_travel",
    "name": "年轻朋友阿甜"
  }
}
```

未找到：

```json
{
  "match": "not_found",
  "candidates": []
}
```

歧义：

```json
{
  "match": "ambiguous",
  "candidates": [
    {
      "id": "acc_xxx",
      "name": "年轻朋友阿甜"
    },
    {
      "id": "acc_yyy",
      "name": "年轻朋友阿甜账号"
    }
  ]
}
```

## 7. 任务查询接口

### 7.1 请求

```http
GET /api/agent/tasks?accountId=acc_travel&date=2026-03-13&status=待拍&limit=20
Authorization: Bearer <token>
```

支持的 query：

- `accountId`：可选
- `date`：可选，格式 `YYYY-MM-DD`
- `status`：可选，`待拍 / 已拍 / 已发`
- `limit`：可选，默认 `50`，最大 `100`

### 7.2 返回示例

```json
{
  "tasks": [
    {
      "id": "task_xxx",
      "accountId": "acc_travel",
      "title": "豆包广告发布",
      "date": "2026-03-13",
      "location": "AI录入",
      "status": "待拍",
      "sortOrder": 0,
      "hitStatus": null,
      "reviewData": "",
      "createdAt": "2026-03-13T08:00:00.000Z",
      "updatedAt": "2026-03-13T08:00:00.000Z"
    }
  ],
  "filters": {
    "accountId": "acc_travel",
    "date": "2026-03-13",
    "status": "待拍",
    "limit": 20
  }
}
```

## 8. 今日任务接口

### 8.1 请求

```http
GET /api/agent/tasks/today?accountId=acc_travel&timezone=Asia/Shanghai&limit=20
Authorization: Bearer <token>
```

支持的 query：

- `accountId`：可选
- `status`：可选
- `timezone`：可选，默认 `Asia/Shanghai`
- `limit`：可选，默认 `50`，最大 `100`

### 8.2 返回示例

```json
{
  "date": "2026-03-13",
  "timezone": "Asia/Shanghai",
  "tasks": [],
  "filters": {
    "accountId": "acc_travel",
    "status": null,
    "limit": 20
  }
}
```

如果传了无效 timezone，会返回 `422`。

## 9. 批量创建任务接口

### 9.1 请求

```http
POST /api/agent/tasks/batch
Authorization: Bearer <token>
Idempotency-Key: <unique-key>
Content-Type: application/json
```

```json
{
  "source": "openclaw",
  "timezone": "Asia/Shanghai",
  "rawText": "年轻朋友阿甜账号今天接了三个广告……",
  "tasks": [
    {
      "accountId": "acc_ai",
      "title": "豆包广告发布",
      "date": "2026-03-14",
      "status": "待拍",
      "location": "AI录入"
    }
  ]
}
```

### 9.2 校验规则

- `Authorization` 必须存在
- `Idempotency-Key` 必须存在
- `source` 必填
- `timezone` 可选，默认 `Asia/Shanghai`
- `tasks` 至少 1 条，最多 20 条
- 每条任务必须带：
  - `accountId`
  - `title`
  - `date`：`YYYY-MM-DD`
  - `status`：`待拍 / 已拍 / 已发`
- `location` 可省略；默认会补成 `AI录入`

### 9.3 返回示例

首次成功创建：

```json
{
  "requestId": "agentreq_xxx",
  "created": [
    {
      "id": "task_xxx",
      "accountId": "acc_ai",
      "title": "豆包广告发布",
      "date": "2026-03-14",
      "location": "AI录入",
      "status": "待拍",
      "sortOrder": 2,
      "hitStatus": null,
      "reviewData": "",
      "createdAt": "2026-03-13T08:00:00.000Z",
      "updatedAt": "2026-03-13T08:00:00.000Z"
    }
  ],
  "skipped": []
}
```

同一个 `Idempotency-Key` 重试：

- 不会重复创建
- 会直接返回第一次成功写入的同一份结果
- HTTP 状态码为 `200`

## 10. 幂等与审计

当前实现新增了 D1 表：

- [migrations/0002_agent_requests.sql](/Users/xiaohao-mini/Code/my-ai-web/migrations/0002_agent_requests.sql)

表内记录：

- `id`
- `source`
- `idempotency_key`
- `raw_text`
- `request_body`
- `result_body`
- `status`
- `created_at`

当前状态流转：

- 初始写入：`processing`
- 成功完成：`succeeded`
- 失败完成：`failed`

行为：

- 同一个 `Idempotency-Key` 只允许第一次真正写入
- 成功后重放会返回同一结果，不再新建任务
- 如果同 key 之前失败，后续重试会返回 `409`

## 11. 错误语义

当前约定：

- `401`：缺少 Bearer token
- `403`：token 不正确
- `400`：缺少 `Idempotency-Key`
- `422`：请求体或参数格式错误
- `409`：重复使用已失败或仍在处理中的 `Idempotency-Key`

结构化校验错误示例：

```json
{
  "error": "Invalid request body",
  "issues": [
    {
      "path": "tasks.0.accountId",
      "message": "Account not found"
    }
  ]
}
```

## 12. 推荐的 skill 调用流程

OpenClaw / skill 推荐按这个顺序工作：

1. 从用户自然语言抽取账号名、品牌名、动作和日期
2. 先调用 `GET /api/agent/accounts` 或 `GET /api/agent/accounts/resolve`
3. 若返回 `not_found` 或 `ambiguous`，向用户追问，不要盲写
4. 如需避免重复创建，可先调 `GET /api/agent/tasks` 或 `GET /api/agent/tasks/today`
5. 把相对日期转成绝对日期 `YYYY-MM-DD`
6. 组装 `tasks[]`
7. 调 `POST /api/agent/tasks/batch`
8. 回给用户“已创建几条任务”的确认

## 13. 第一版任务映射建议

当前建议的 skill 映射：

- “明天发 / 后天发”
  - 标题：`<品牌>广告发布`
  - `status = 待拍`
  - `date = 绝对日期`
- “今天出文案”
  - 标题：`<品牌>广告文案`
  - `status = 待拍`
  - `date = 今天`
- 只有明确表达“已经发了 / 已拍完 / 已经发布”时，才允许直接映射到 `已拍 / 已发`

## 14. 网页端配合行为

为了让“AI 在别处写，网页负责展示”成立，当前网页已经补了两类自动刷新：

- 页面 `focus` 时轻量刷新 `accounts + tasks`
- 页面可见时每 `60s` 自动刷新一次 `accounts + tasks`

`Ads` 仍保持按需懒加载，不因为 agent API 而改成首屏全量请求。

## 15. 测试现状

当前已落地的自动化覆盖：

- `401 / 403` 鉴权
- `accounts` 列表查询
- `resolve` 的 `exact / not_found / ambiguous`
- `tasks` 过滤查询
- `tasks/today` 今日视图
- `tasks/batch` 的批量创建和幂等重放
- 非法请求体 `422`
- 页面在不整页刷新的前提下，通过 `focus` 自动同步到 agent 创建的新任务

相关用例：

- [tests/e2e/agent-api.spec.ts](/Users/xiaohao-mini/Code/my-ai-web/tests/e2e/agent-api.spec.ts)

## 16. OpenClaw Skill

仓库里已经放了一份 workspace skill：

- [skills/mam-task/SKILL.md](/Users/xiaohao-mini/Code/my-ai-web/skills/mam-task/SKILL.md)
- [skills/mam-task/scripts/mam-task.mjs](/Users/xiaohao-mini/Code/my-ai-web/skills/mam-task/scripts/mam-task.mjs)

技能名我定成了：

- `mam-task`

这个名字的含义很直接：

- `mam` 对应当前站点 `mam.midao.site`
- `task` 表示它负责把结构化任务写入当前项目

### 16.1 它做什么

- 支持直接查账号列表：`list-accounts`
- 支持 resolve 账号：`resolve-account`
- 支持查某账号某天任务：`list-tasks`
- 支持查今天任务：`list-today`
- 在 `create-batch` 前默认先查 `/api/agent/tasks` 做重复检查
- 只把真正需要新建的任务提交到 `/api/agent/tasks/batch`
- 默认把原始自然语言放进 `rawText`
- 默认把幂等 key 收敛在脚本层，避免 agent 重试时重复建任务

### 16.2 OpenClaw 配置建议

按 OpenClaw 当前文档，workspace 下的 `skills/` 目录会被自动发现；技能环境变量可以通过 `openclaw.json` 里的 `skills.entries.<skillKey>.env` 注入。

建议配置：

```json
{
  "skills": {
    "entries": {
      "mam-task": {
        "env": {
          "MAM_AGENT_API_BASE_URL": "https://mam.midao.site",
          "MAM_AGENT_API_TOKEN": "你的_AGENT_API_TOKEN"
        }
      }
    }
  }
}
```

这样 token 只存在环境变量里，不进入 skill prompt，也不会硬编码进仓库。

### 16.3 为什么用脚本，不直接 curl

- token 不需要每次手工拼 header
- `create-batch` 会在脚本层生成稳定的默认 `Idempotency-Key`
- `create-batch` 会先查询同账号同日期任务并跳过重复项
- 输出始终是 JSON，方便 OpenClaw 后续再读结果
- 以后要扩展成更多命令时，不用每次重写 curl 模板
