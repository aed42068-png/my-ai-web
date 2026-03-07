# Wrangler CLI Guide

## 1. 先回答问题：Wrangler CLI 对这个项目有没有用

有，而且不是“可有可无”的程度。

对当前仓库，`wrangler` 不是一个辅助工具，而是 Cloudflare 侧的控制平面 CLI。没有它，你仍然能写代码，但你很难把这个项目完整地跑起来、部署出去、连上 D1/R2、管理 secrets、看日志和做迁移。

## 2. 它在这个项目里的定位

当前项目的本地开发并不是“Wrangler 或 Vite 二选一”，而是两者分工：

- `Vite + @cloudflare/vite-plugin`
  - 负责前端开发体验
  - 负责本地应用开发主循环
  - 负责把 Worker 和前端一起接到 Vite 工作流里
- `Wrangler CLI`
  - 负责 Cloudflare 资源与部署
  - 负责环境配置
  - 负责数据库迁移
  - 负责 secrets 管理
  - 负责日志与线上调试

结论：

- 前端开发主循环：优先 `npm run dev`
- 资源/运维/部署：必须使用 `wrangler`

## 2.1 这个项目要不要全局安装 Wrangler

不需要，默认不建议全局安装。

当前仓库已经把 `wrangler` 放在 [package.json](/Users/xiaohao-mini/Code/my-ai-web/package.json) 的 `devDependencies` 里，这就是推荐形态。这样做有几个直接好处：

- 团队和不同机器会锁定在同一个 `wrangler` 版本
- 不会因为你电脑上的全局版本过新或过旧，导致命令行为漂移
- `npm run deploy`、`npm run preview`、`npx wrangler ...` 都会优先使用项目内版本

对当前项目，推荐顺序是：

```bash
npm install
npx wrangler --version
```

只在下面两种情况再考虑全局安装：

- 你要在很多无关仓库里频繁手敲 `wrangler`
- 你明确接受“全局版本和项目版本不一致”的维护成本

即使你全局装了，这个仓库仍然建议优先走：

```bash
npx wrangler ...
```

或直接走项目脚本：

```bash
npm run deploy
npm run preview
```

## 2.2 这个项目要不要继续 Cloudflare 授权

要，但要区分场景。

### 本机开发和手动部署

如果你要在这台机器上执行下面这些操作，就需要继续完成 Cloudflare 授权：

- `wrangler d1 create`
- `wrangler r2 bucket create`
- `wrangler secret put`
- `wrangler deploy`
- `wrangler tail`

最稳的流程是先检查：

```bash
npx wrangler whoami
```

如果还没登录，再执行：

```bash
npx wrangler login
```

这一步是一次性 OAuth 登录，适合你现在这种“本机开发 + 手动部署”的项目阶段。

### CI/CD

如果后续你把部署交给 GitHub Actions 或其他 CI，就不要在 CI 里跑 `wrangler login`，而是改用：

- `CLOUDFLARE_API_TOKEN`
- 必要时再补 `CLOUDFLARE_ACCOUNT_ID`

也就是说：

- 你自己的电脑：优先 `wrangler login`
- 自动化部署：优先 API Token

## 3. 为什么它对这个项目特别重要

### 3.1 它是 Cloudflare 资源生命周期入口

这个项目依赖的核心资源都在 Cloudflare 上：

- Worker
- Static Assets
- D1
- R2
- Secrets

Wrangler 直接对应这些资源的配置和操作能力。对我们这个项目，它解决的不是“本地打包”，而是“让代码真正连上平台资源”。

### 3.2 它让 `wrangler.jsonc` 成为单一事实来源

当前项目的核心 Cloudflare 配置在 [wrangler.jsonc](/Users/xiaohao-mini/Code/my-ai-web/wrangler.jsonc)：

- Worker 入口
- compatibility date
- assets 行为
- D1 binding
- R2 binding
- 非敏感 vars

这使得项目的部署和资源绑定不需要散落在多个平台配置里。

### 3.3 它是 D1 migration 的正式入口

当前 schema 在 [migrations/0001_init.sql](/Users/xiaohao-mini/Code/my-ai-web/migrations/0001_init.sql)。

这些迁移并不是“有 SQL 文件就行”，而是要靠 Wrangler 真正应用到 D1：

- 本地应用
- 远程应用
- 后续版本迁移

如果没有 Wrangler，D1 只会停留在设计层面。

### 3.4 它是 secrets 的正确注入方式

我们的 Worker 会为 R2 生成 presigned URL，需要：

- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

这些值不应该进仓库，不应该放在前端，也不应该写进 `vars`。Wrangler 提供了标准的 secret 管理路径。

### 3.5 它是生产问题定位工具

这个项目后续最常见的问题会出在：

- D1 绑定没对上
- R2 签名变量缺失
- bucket CORS 不正确
- preview 与 production 配置不一致
- Worker 路由和静态资源路由冲突

这些问题最终都要靠 Wrangler 的：

- `wrangler dev`
- `wrangler deploy`
- `wrangler tail`
- `wrangler d1 ...`

来定位。

## 4. 对当前仓库最有用的 Wrangler 能力

### 4.1 部署

最核心命令：

```bash
wrangler deploy
```

当前项目已经把它接到脚本里：

```bash
npm run deploy
```

作用：

- 上传 Worker bundle
- 上传静态资源
- 应用绑定配置

### 4.2 本地或接近生产的运行

最常用的两种方式：

```bash
npm run dev
wrangler dev --config dist/my_ai_web/wrangler.json --port 4173
```

前者是主开发循环，后者更适合：

- 检查 build 产物
- 模拟更接近部署后的 Worker 行为
- 排查 Vite 和部署产物不一致的问题

对当前仓库还有一个很具体的原因：

- `npm run build` 会在退出时自动清理 `dist/my_ai_web/.dev.vars`
- `npm run preview` 会临时复制 `.dev.vars` 给 `wrangler dev` 读取，并在退出时删掉
- 这样既保留本地预览能力，也避免把 R2 secret 长时间留在构建产物里

### 4.2.1 compatibility date fallback 是什么意思

如果你在本地看到类似提示：

```text
The latest compatibility date supported by the installed Cloudflare Workers Runtime is "2026-03-01",
but you've requested "2026-03-06". Falling back to "2026-03-01"...
```

含义是：

- [wrangler.jsonc](/Users/xiaohao-mini/Code/my-ai-web/wrangler.jsonc) 里配置的 `compatibility_date` 比你本机当前的 Workers runtime 更新
- 本地开发会自动按较旧的日期运行
- 线上生产环境不一定受这个限制

这不是当前项目的阻断问题，但说明：

- 本地模拟和线上运行时可能存在轻微差异
- 如果后续你要依赖更近日期的 Workers 行为，应该升级本机的 Wrangler/runtime 再验证

### 4.3 D1

对当前仓库非常关键：

```bash
wrangler d1 create my-ai-web
wrangler d1 migrations apply my-ai-web --local
wrangler d1 migrations apply my-ai-web --remote
wrangler d1 execute my-ai-web --remote --command "SELECT * FROM accounts;"
```

作用：

- 创建数据库
- 应用迁移
- 验证线上数据
- 快速排查 schema 或数据问题

### 4.4 R2

对当前仓库，R2 已经不是“从零创建”的状态了。

当前已经确认的真实资源是：

- bucket：`tian`
- 自定义域名：`https://assets-tian.midao.site`
- 应用域名：`https://mam.midao.site`
- 临时验证域名：`https://my-ai-web.shunhaozeng.workers.dev`

因此，Wrangler 在 R2 上更常用于“核对状态和维护配置”：

```bash
wrangler r2 bucket info tian
wrangler r2 bucket domain list tian
wrangler r2 bucket cors list tian
wrangler r2 bucket cors set tian --file ./cloudflare/r2-cors.json
```

注意：

- 当前 bucket 已经配置了 CORS，允许：
  - `http://localhost:3000`
  - `https://my-ai-web.shunhaozeng.workers.dev`
  - `https://mam.midao.site`
- [cloudflare/r2-cors.json](/Users/xiaohao-mini/Code/my-ai-web/cloudflare/r2-cors.json) 的格式必须是 Cloudflare API 需要的 `rules -> allowed.origins/methods/headers`，不是 S3 风格的 `AllowedOrigins`
- `cloudflare/r2-cors.json` 里的 origin 应该填写“应用站点域名”，不是资产域名 `assets-tian.midao.site`
- Worker 里生成 presigned URL 依赖的是 **R2 S3 API 凭证**
- 这组凭证不是 Wrangler 自动替你生成的
- 需要你在 Cloudflare 后台创建后，再用 `wrangler secret put` 注入

### 4.5 Secrets

当前项目必须使用：

```bash
wrangler secret put R2_ACCESS_KEY_ID
wrangler secret put R2_SECRET_ACCESS_KEY
```

当前线上 Worker 已经验证通过这两个绑定名；真实上传链路能够成功走通。
更关键的是，secret 名称必须和 Worker 代码读取的绑定名完全一致：

- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

如果你在 Cloudflare 控制台里用了别的名字，Wrangler / Dashboard 看起来像“已经有 secret”，但运行时仍然会报 `R2 signing environment is incomplete`。

本地开发则用：

- `.dev.vars`
- `.dev.vars.<environment>`

因此 `.gitignore` 已经调整为忽略 `.dev.vars*`。

### 4.6 日志

出了线上问题，Wrangler 的 `tail` 是第一入口：

```bash
wrangler tail my-ai-web
```

适合排查：

- 上传签名失败
- D1 查询报错
- 环境变量缺失
- 资源不存在

## 5. 这个项目里，Wrangler 不该承担什么

Wrangler 很重要，但不应该替代一切。

### 5.1 不应该替代日常前端开发循环

前端页面开发时，主入口还是：

```bash
npm run dev
```

原因：

- React/Vite 的开发反馈更快
- Cloudflare Vite plugin 已经把 Worker 和平台能力带进来了
- 不需要每次为了调一个组件都走“纯 Wrangler 工作流”

### 5.2 不应该承载业务逻辑配置

Wrangler 适合存放：

- 平台配置
- 绑定
- 环境变量
- 部署信息

不适合存放：

- 业务规则
- 内容配置
- 复杂业务常量

这些应该留在应用代码和数据库中。

## 6. 当前项目建议的 Wrangler 使用方式

### 6.1 开发阶段

```bash
npm run dev
```

用途：

- 前端开发
- 接口联调
- 本地 Worker 行为验证

### 6.2 检查构建产物

```bash
npm run build
npm run preview
```

用途：

- 检查 Vite 输出
- 检查部署后 Worker 配置
- 检查 `dist/client` 和 `dist/my_ai_web` 产物

### 6.3 资源管理阶段

```bash
wrangler d1 ...
wrangler r2 ...
wrangler secret put ...
```

用途：

- 初始化或维护 Cloudflare 资源

### 6.4 发布阶段

```bash
npm run deploy
```

用途：

- 标准化发布 Worker 和静态资源

### 6.5 线上排错阶段

```bash
wrangler tail my-ai-web
wrangler d1 execute my-ai-web --remote --command "SELECT ..."
```

用途：

- 诊断部署后问题

## 7. 当前仓库中的 Wrangler 入口

### 7.1 配置文件

- [wrangler.jsonc](/Users/xiaohao-mini/Code/my-ai-web/wrangler.jsonc)

### 7.2 package scripts

定义在 [package.json](/Users/xiaohao-mini/Code/my-ai-web/package.json)：

- `npm run preview`
- `npm run deploy`
- `npm run cf:types`
- `npm run db:migrate:local`

### 7.3 本地变量文件

- [/.dev.vars.example](/Users/xiaohao-mini/Code/my-ai-web/.dev.vars.example)
- 实际本地文件：`.dev.vars`

## 8. 关于 environments 的建议

当前仓库还没有拆 `env.staging` / `env.production`，但后续建议尽早补上。

原因：

- 预览环境和生产环境的 bucket / D1 最终会不同
- preview bucket 不应该和生产 bucket 混用
- staging 通常需要独立 secrets

建议后续补充：

- `env.staging`
- staging 专用 D1
- staging 专用 R2 bucket
- staging 专用 R2 signing secrets

同时要记住一个 Wrangler 使用习惯：

- 环境下的很多字段不是自动继承的
- bindings 和 vars 通常要显式为每个环境配置

## 9. 对当前项目的最终判断

### 9.1 Wrangler 是不是有用

有，而且是基础设施级别有用。

### 9.2 Wrangler 是不是开发主入口

不是。日常 UI 开发仍然以 Vite 为主。

### 9.3 最准确的描述

对这个项目：

- `Vite plugin` 负责开发体验
- `Wrangler CLI` 负责 Cloudflare 平台接入、资源管理、迁移、部署和运维

不是替代关系，而是分工关系。

## 10. 官方资料

- [Wrangler Overview](https://developers.cloudflare.com/workers/wrangler/)
- [Wrangler Commands](https://developers.cloudflare.com/workers/wrangler/commands/)
- [Wrangler Configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Wrangler Environments](https://developers.cloudflare.com/workers/wrangler/environments/)
- [Wrangler Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [Cloudflare Vite Plugin](https://developers.cloudflare.com/workers/vite-plugin/)
