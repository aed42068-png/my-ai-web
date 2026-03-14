# my-ai-web

Cloudflare 全栈版内容管理应用：

- 前端：Vite + React
- 后端：Cloudflare Workers + Hono
- 数据库：D1
- 文件上传：浏览器直传 R2，Worker 签发 presigned URL
- 部署：单 Worker + Static Assets

## 文档

- [docs/README.md](/Users/xiaohao-mini/Code/my-ai-web/docs/README.md)
- [docs/current-product-status.md](/Users/xiaohao-mini/Code/my-ai-web/docs/current-product-status.md)
- [docs/cloudflare-architecture.md](/Users/xiaohao-mini/Code/my-ai-web/docs/cloudflare-architecture.md)
- [docs/agent-api.md](/Users/xiaohao-mini/Code/my-ai-web/docs/agent-api.md)
- [docs/agent-skill-sync-workflow.md](/Users/xiaohao-mini/Code/my-ai-web/docs/agent-skill-sync-workflow.md)
- [docs/openclaw-remote-skill-setup.md](/Users/xiaohao-mini/Code/my-ai-web/docs/openclaw-remote-skill-setup.md)
- [docs/wrangler-cli-guide.md](/Users/xiaohao-mini/Code/my-ai-web/docs/wrangler-cli-guide.md)
- [docs/setup-and-deploy-runbook.md](/Users/xiaohao-mini/Code/my-ai-web/docs/setup-and-deploy-runbook.md)
- [AGENTS.md](/Users/xiaohao-mini/Code/my-ai-web/AGENTS.md)

## 本地开发

1. 安装依赖

```bash
npm install
```

2. 准备本地变量

```bash
cp .dev.vars.example .dev.vars
```

3. 创建 D1 数据库和 R2 bucket，然后把真实值填到 [wrangler.jsonc](/Users/xiaohao-mini/Code/my-ai-web/wrangler.jsonc) 与 `.dev.vars`

- `database_id`
- `bucket_name`
- `preview_bucket_name`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `AGENT_API_TOKEN`

4. 应用本地 migrations

```bash
npm run db:migrate:local
```

5. 启动开发环境

```bash
npm run dev
```

## OpenClaw / Skill

仓库内已经包含一份 workspace skill：

- [skills/mam-task/SKILL.md](/Users/xiaohao-mini/Code/my-ai-web/skills/mam-task/SKILL.md)

它现在不仅能写任务，也能查询账号/任务，并在写入前自动做重复检查。详细配置见 [docs/agent-api.md](/Users/xiaohao-mini/Code/my-ai-web/docs/agent-api.md)。

## R2 CORS

上传走浏览器直传 R2，bucket 需要先配置 CORS。示例配置在 [cloudflare/r2-cors.json](/Users/xiaohao-mini/Code/my-ai-web/cloudflare/r2-cors.json)。

## 主要接口

- `GET /api/accounts`
- `POST /api/accounts`
- `PATCH /api/accounts/:id`
- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `DELETE /api/tasks/:id`
- `POST /api/tasks/:id/review`
- `GET /api/ad-records`
- `POST /api/ad-records`
- `PATCH /api/ad-records/:id`
- `DELETE /api/ad-records/:id`
- `GET /api/agent/accounts`
- `GET /api/agent/accounts/resolve`
- `GET /api/agent/tasks`
- `GET /api/agent/tasks/today`
- `POST /api/agent/tasks/batch`
- `POST /api/uploads/sign`
- `POST /api/uploads/complete`
- `GET /api/assets/*`

## 部署

1. 先设置生产 secrets

```bash
wrangler secret put R2_ACCESS_KEY_ID
wrangler secret put R2_SECRET_ACCESS_KEY
wrangler secret put AGENT_API_TOKEN
```

2. 部署 Worker 与静态资源

```bash
npm run deploy
```

## 目录说明

- [worker/index.ts](/Users/xiaohao-mini/Code/my-ai-web/worker/index.ts)：Hono API 与 R2 直传签名逻辑
- [migrations/0001_init.sql](/Users/xiaohao-mini/Code/my-ai-web/migrations/0001_init.sql)：D1 schema 与初始数据
- [migrations/0002_agent_requests.sql](/Users/xiaohao-mini/Code/my-ai-web/migrations/0002_agent_requests.sql)：agent API 幂等与审计表
- [wrangler.jsonc](/Users/xiaohao-mini/Code/my-ai-web/wrangler.jsonc)：Workers Static Assets、D1、R2 绑定配置
