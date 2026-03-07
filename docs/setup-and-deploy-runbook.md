# Setup And Deploy Runbook

## 1. 目标

这份 runbook 记录把当前仓库从“代码状态”变成“可运行 Cloudflare 应用”所需的最小步骤。

适用场景：

- 新机器初始化
- 新账号或新项目初始化
- 首次部署
- staging / production 重建

## 2. 一次性准备

### 2.1 安装依赖

当前项目不要求全局安装 `wrangler`。

仓库已经把 `wrangler` 放进 [package.json](/Users/xiaohao-mini/Code/my-ai-web/package.json) 的 `devDependencies`，因此默认做法是先安装项目依赖，再通过 `npx wrangler` 或 `npm run ...` 调用项目内版本。

```bash
npm install
```

安装完成后可以先确认版本：

```bash
npx wrangler --version
```

### 2.2 检查 Cloudflare 授权状态

```bash
npx wrangler whoami
```

如果已经显示你的 Cloudflare 账号信息，可以继续后面的 D1、R2 和部署步骤。

如果还没有授权，再执行：

```bash
npx wrangler login
```

这一步适用于本机开发和手动部署。

### 2.3 CI/CD 的授权方式

如果以后接 GitHub Actions 或其他 CI，不要在 CI 里使用交互式 `wrangler login`，应改为注入：

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`（按实际需要）

## 3. 创建 Cloudflare 资源

### 3.1 创建 D1

```bash
npx wrangler d1 create my-ai-web
```

执行后把返回的真实 `database_id` 写回 [wrangler.jsonc](/Users/xiaohao-mini/Code/my-ai-web/wrangler.jsonc)。

### 3.2 创建 R2 bucket

当前项目已经确认复用现有 bucket：

- bucket：`tian`
- 自定义域名：`https://assets-tian.midao.site`
- 应用域名：`https://mam.midao.site`

因此这一步通常不需要再创建新 bucket；只有你以后想把 preview / staging 与 production 拆开时，才需要额外创建新 bucket。

如果要核对现有 bucket 状态，可以用：

```bash
npx wrangler r2 bucket list
npx wrangler r2 bucket info tian
npx wrangler r2 bucket domain list tian
```

当前仓库中的 [wrangler.jsonc](/Users/xiaohao-mini/Code/my-ai-web/wrangler.jsonc) 已经改成使用 `tian`。

### 3.3 配置 R2 CORS

当前 `tian` bucket 已经配置了 CORS，允许下面这些 origin：

- `http://localhost:3000`
- `https://my-ai-web.shunhaozeng.workers.dev`
- `https://mam.midao.site`

如果后续要修改 CORS，再执行：

```bash
npx wrangler r2 bucket cors list tian
npx wrangler r2 bucket cors set tian --file ./cloudflare/r2-cors.json
```

这里有一个关键点：

- origin 要填写“发起上传请求的应用域名”
- 不要误填成资产域名 `assets-tian.midao.site`
- [cloudflare/r2-cors.json](/Users/xiaohao-mini/Code/my-ai-web/cloudflare/r2-cors.json) 使用的是 Cloudflare API 需要的 `rules -> allowed.origins/methods/headers` 结构

所以执行前，先检查并修改 [cloudflare/r2-cors.json](/Users/xiaohao-mini/Code/my-ai-web/cloudflare/r2-cors.json)。

## 4. 创建 R2 S3 API 凭证

当前上传签名逻辑使用的是 R2 的 S3 兼容签名方式，因此 Worker 需要：

- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

这一步通常需要在 Cloudflare 控制台创建 R2 API Token / Access Keys。

创建完成后：

- 本地开发放进 `.dev.vars`
- 线上部署放进 Wrangler secrets

## 5. 本地开发配置

### 5.1 复制本地变量模板

```bash
cp .dev.vars.example .dev.vars
```

### 5.2 填写 `.dev.vars`

至少填写：

- `R2_ACCOUNT_ID`
- `R2_BUCKET_NAME`：当前为 `tian`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_PUBLIC_BASE_URL`：当前为 `https://assets-tian.midao.site`

### 5.3 应用本地 D1 migration

```bash
npm run db:migrate:local
```

### 5.4 启动本地开发

```bash
npm run dev
```

## 6. 生产配置

### 6.1 设置 secrets

```bash
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
```

当前线上 Worker 已经补上并验证通过这两个 secret 绑定，图片上传链路可以正常使用。
这里有一个容易踩坑的点：

- secret 名必须精确叫做 `R2_ACCESS_KEY_ID`
- secret 名必须精确叫做 `R2_SECRET_ACCESS_KEY`

如果你在 Dashboard 里创建了别的 secret 名称，Worker 运行时仍然读不到，`/api/uploads/sign` 会直接返回 `R2 signing environment is incomplete`。

### 6.2 检查 `wrangler.jsonc`

上线前确认：

- `name`
- `database_id`
- `bucket_name`
- `preview_bucket_name`
- `R2_ACCOUNT_ID`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_BASE_URL`

都已经改成真实值。

## 7. 发布流程

### 7.1 构建

```bash
npm run build
```

说明：

- 当前 `build` 脚本会在构建结束或中断时自动删除 `dist/my_ai_web/.dev.vars`
- 不要跳过项目脚本，直接复用中间产物做部署

### 7.2 部署

```bash
npm run deploy
```

### 7.3 远程应用数据库迁移

如果新增 migration：

```bash
npx wrangler d1 migrations apply my-ai-web --remote
```

## 8. 发布后验证

### 8.1 基础验证

- 正式站点：`https://mam.midao.site`
- 打开首页，确认 SPA 正常加载
- 刷新非根路由，确认不会 404
- `GET /api/health` 返回正常

### 8.2 数据验证

- 能拉到账号列表
- 能创建任务
- 能保存任务复盘
- 能新增、编辑、删除收入或投放记录
- 能切换收入结算状态

### 8.3 上传验证

- 能拿到 `POST /api/uploads/sign`
- 浏览器可以 PUT 到 R2
- `POST /api/uploads/complete` 能成功
- 封面上传后页面能正常展示

## 9. 排障命令

### 9.1 看 Worker 日志

```bash
npx wrangler tail my-ai-web
```

### 9.2 直接查 D1

```bash
npx wrangler d1 execute my-ai-web --remote --command "SELECT * FROM accounts;"
```

### 9.3 预览构建产物

```bash
npm run preview
```

说明：

- `preview` 会临时把本地 `.dev.vars` 复制到 `dist/my_ai_web/.dev.vars` 供 `wrangler dev` 读取
- 进程退出后会自动清理这个文件

## 10. 已知注意事项

- 当前仓库默认还是单环境配置，后续建议补 `env.staging`
- 当前 `preview_bucket_name` 暂时也指向 `tian`，能跑通，但不建议长期与 production 混用
- 自定义域名部署后，`workers_dev` 当前未显式开启；如果你还想长期保留 `workers.dev` 地址，需要在 [wrangler.jsonc](/Users/xiaohao-mini/Code/my-ai-web/wrangler.jsonc) 里显式加 `workers_dev = true`
- R2 直传能否成功，强依赖 bucket CORS 是否正确
- Worker 能否签发上传 URL，强依赖 secrets 是否存在
- 若要用正式域名直接展示资产，`R2_PUBLIC_BASE_URL` 需要与 bucket 的公网访问方案一致
- 本地 dev runtime 当前会把 `compatibility_date` 从 `2026-03-06` 回退到 `2026-03-01`；这是本机 runtime 版本落后，不是线上故障

## 11. 相关文件

- [wrangler.jsonc](/Users/xiaohao-mini/Code/my-ai-web/wrangler.jsonc)
- [worker/index.ts](/Users/xiaohao-mini/Code/my-ai-web/worker/index.ts)
- [migrations/0001_init.sql](/Users/xiaohao-mini/Code/my-ai-web/migrations/0001_init.sql)
- [cloudflare/r2-cors.json](/Users/xiaohao-mini/Code/my-ai-web/cloudflare/r2-cors.json)
- [/.dev.vars.example](/Users/xiaohao-mini/Code/my-ai-web/.dev.vars.example)
