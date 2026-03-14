# E2E Behavior Test Plan

## 1. 目标

这份文档定义当前项目的端到端行为测试范围、验收标准、自动化边界和执行方式。

当前项目的核心目标不是做“静态页面截图回归”，而是验证下面 4 条业务链路在真实浏览器里是否完整闭环：

- 首页 `Home`：账号管理、任务创建/编辑/删除、任务状态流转、复盘保存
- 归档页 `Archive`：按日期查看、搜索、创建/编辑/删除任务、归档显示设置
- 投放页 `Ads`：账号切换、收入/投放记录创建、编辑、删除、结算切换、月份切换、收入状态筛选
- 上传链路：浏览器 -> Worker `sign` -> R2 `PUT` -> Worker `complete` -> D1 落库 -> 资产域名可读
- Agent API：账号解析、Bearer 鉴权、批量建任务、批量建投放/收益记录、幂等重放、页面自动同步
- Agent API：账号列表、任务查询、今日任务视图、投放/收益查询和月度汇总
- 页面操作提示：各页首次展示可关闭的使用指引，并记住关闭状态
- 投放页顶部主卡直接使用当前账号截图作为背景
- 首页账号卡使用内嵌预览结构，避免封面在列表里显得过度放大

## 2. 测试环境

### 2.1 本地运行基线

- 前端与 Worker：`npm run dev`
- 本地数据库：Wrangler local D1
- 本地数据库初始化：`npm run db:migrate:local`
- 浏览器自动化：
  - 探索式验证：`agent-browser`
  - 可执行回归：`@playwright/test`
- Playwright 默认设备：Chromium 下的 `iPhone 12 Pro` 模拟
- E2E 默认把移动端布局和触控交互当作主回归面，而不是桌面视口
- agent API 的自动化请求默认使用 localhost 专用 token `dev-agent-token`

### 2.4 当前自动化入口

- 本地回归命令：`npm run e2e`
- 本地带界面调试：`npm run e2e:headed`
- 测试报告：`npm run e2e:report`
- Playwright 配置文件：[playwright.config.ts](/Users/xiaohao-mini/Code/my-ai-web/playwright.config.ts)
- 测试目录：[tests/e2e](/Users/xiaohao-mini/Code/my-ai-web/tests/e2e)
- 当前默认模拟设备来自 Playwright `devices['iPhone 12 Pro']`，并固定运行在 `chromium`

### 2.2 当前环境假设

- `.dev.vars` 已配置真实的 R2 签名凭证
- 本地 dev server 会读取 `.dev.vars`
- 本地 D1 可以安全重置
- R2 上传会命中真实 bucket `tian`
- 真实资产域名为 `https://assets-tian.midao.site`

### 2.3 数据策略

- 自动化回归默认运行在“重置后的本地 D1”上，确保任务、账号、投放记录具备稳定初始数据
- 上传测试会命中真实 R2，因此会产生真实对象；测试数据应使用明显的 `e2e-`/`codex-` 前缀，便于后续清理

## 3. 自动化范围

### 3.1 必须自动化

- 应用加载成功，三大 tab 可切换
- 首页任务 CRUD 和状态流转可用
- 首页任务表单使用“备注”文案，同时仍兼容底层 `location` 字段
- 首页显式进入排序模式后可拖动调整任务顺序
- 首页横滑账号卡后，当前账号与下方内容保持同步
- 首页点击上方账号 tab 后，下方账号卡轮播仍与当前账号保持同步
- 首页账号一览抽屉可切换账号并保存排序
- 首页发布概览支持 `当前账号 / 全部账号` 切换，并显示全局任务总数
- 首页复盘保存可用
- 首页账号新增和编辑名称可用
- 归档页按日期查看、搜索、任务 CRUD 可用
- 归档任务表单使用“备注”文案，同时仍兼容底层 `location` 字段
- 归档页显式进入排序模式后可拖动调整同状态任务顺序
- 归档页搜索支持 Enter 和“确定”按钮提交
- 归档页显示设置保存到 `localStorage` 后刷新仍生效
- 三个页面的操作提示卡关闭后会持久化，并可通过触发按钮重新打开
- 投放页收入记录新增、编辑、删除、结算切换、筛选切换、月份切换可用
- Worker API 健康检查可用
- `GET /api/agent/accounts/resolve` 的 `exact / not_found / ambiguous` 可用
- `GET /api/agent/accounts`、`GET /api/agent/tasks`、`GET /api/agent/tasks/today` 可用
- `GET /api/agent/ad-records`、`GET /api/agent/ad-records/monthly` 可用
- `POST /api/agent/tasks/batch` 的 Bearer 鉴权、结构化校验、幂等重放可用
- `POST /api/agent/ad-records/batch` 的 Bearer 鉴权、结构化校验、幂等重放可用
- agent 新建任务后，网页端可通过 `focus` 自动同步到新数据
- agent 新建投放/收益记录后，网页端可通过 `focus` 自动同步到 Ads 数据

### 3.2 必须做在线烟测

- 账号封面图片上传
- 上传完成后的资产 URL 可访问
- 上传资产元数据成功写入 D1

说明：

- 上传链路会写入真实 R2；这条链路会被自动化代码覆盖，但它更接近“在线烟测”，不适合作为高频无痕回归

### 3.3 当前不作为首批自动化主断言

- 触屏手势滑动删除的物理手势细节
- 任务/账号拖拽排序的动画表现
- 视觉样式、阴影、渐变和像素级快照

这些内容后续可以补，但第一优先级是业务行为正确。

## 4. 测试矩阵

### 4.1 Home

- 首屏加载后能看到默认账号和分组任务
- 切换账号后任务列表跟随切换
- 点击上方账号 tab 与滚动下方账号卡轮播都会保持同一个当前账号
- 打开账号一览后可切换账号并保存新顺序
- 新增账号成功并持久化显示
- 编辑账号名称成功
- 新建任务成功
- 修改任务成功
- 删除任务成功
- 排序模式下拖动任务后顺序持久化
- 任务左侧圆点可推进状态到下一层
- 已拍任务可打开复盘并保存

### 4.2 Archive

- 从底部导航进入归档页成功
- 日期切换后任务列表变化正确
- 搜索能按任务标题/复盘/账号名称命中
- 在归档页新增任务成功
- 在归档页修改任务成功
- 在归档页删除任务成功
- 排序模式下拖动同状态任务后顺序持久化
- 打开归档显示设置，修改后刷新页面仍保留

### 4.3 Ads

- 从底部导航进入投放页成功
- 月度概览区显示当前选中账号和月份
- 新增收入记录成功
- 新增投放记录成功
- 编辑收入或投放记录成功
- 删除投放记录成功
- 收入记录结算状态可快速切换
- 收入筛选 `全部 / 已结算 / 未结算` 生效
- 月度切换后记录列表和汇总变化正确

### 4.4 Upload

- 选择图片后，弹窗顶部实时预览会立即切换到新封面
- 新图片保存前必须先确认封面位置
- 通过 UI 选择图片文件
- Worker 成功返回 presigned URL
- 浏览器成功 PUT 到 R2
- `complete` 返回资产元数据
- 资产域名返回 `200` 且 `content-type` 正确

### 4.5 Agent API

- 缺少 token 返回 `401`
- 错误 token 返回 `403`
- `resolve` 精确命中返回唯一账号
- `resolve` 未命中返回 `not_found`
- `resolve` 多命中返回 `ambiguous`
- `accounts` 可返回可解析账号列表
- `tasks` 支持 `accountId / date / status / limit` 查询
- `tasks/today` 支持基于 `Asia/Shanghai` 的今日任务查询
- `ad-records` 支持 `accountId / date / type / settlementStatus / limit` 查询
- `ad-records/monthly` 支持按账号和年份读取 12 个月汇总
- `tasks/batch` 一次可创建多条任务
- `ad-records/batch` 一次可创建多条收入/投放记录
- 同一个 `Idempotency-Key` 重放不会重复创建任务
- 同一个 `Idempotency-Key` 重放不会重复创建投放/收益记录
- 非法请求体返回 `422`
- 页面无需整页刷新，仅通过 `focus` 即可看到 agent 新建任务
- 页面无需整页刷新，仅通过 `focus` 即可看到 agent 新建投放/收益记录

## 5. 通过标准

- 自动化用例全绿
- 不出现阻断性 console error / page error
- 关键写操作后刷新页面仍能读到变更
- 上传链路至少完成一次真实成功验证
- 文档中的手工检查项全部可复现

## 6. 风险点

- 本地 dev server 当前会提示 compatibility date fallback 到 `2026-03-01`，这不是当前阻断项，但需要记录
- 上传测试会向真实 R2 写入对象，需要控制频次并保留可清理前缀
- 归档显示设置依赖 `localStorage`，测试需要显式断言刷新后的持久性
- 目前项目仍然没有“删除账号 / 删除资产”能力，因此相关测试不能做全量业务数据清理

## 7. 已落地的自动化实现

当前已经落地的自动化用例：

- [tests/e2e/agent-api.spec.ts](/Users/xiaohao-mini/Code/my-ai-web/tests/e2e/agent-api.spec.ts)
- [tests/e2e/home.spec.ts](/Users/xiaohao-mini/Code/my-ai-web/tests/e2e/home.spec.ts)
- [tests/e2e/archive.spec.ts](/Users/xiaohao-mini/Code/my-ai-web/tests/e2e/archive.spec.ts)
- [tests/e2e/ads.spec.ts](/Users/xiaohao-mini/Code/my-ai-web/tests/e2e/ads.spec.ts)
- [tests/e2e/guides.spec.ts](/Users/xiaohao-mini/Code/my-ai-web/tests/e2e/guides.spec.ts)
- [tests/e2e/upload.spec.ts](/Users/xiaohao-mini/Code/my-ai-web/tests/e2e/upload.spec.ts)

为了让这些用例稳定运行，项目已补充：

- 关键交互的 `data-testid`
- 重复图标按钮的 `aria-label`
- Playwright Web Server 与本地 D1 migration 启动逻辑
- E2E 测试产物目录 `output/playwright/`
- 浏览器上传完成后的重试逻辑
- Worker 对 R2 上传完成校验的双路径兜底
- `Ads` 页新增了记录编辑、删除和结算状态快速切换路径
- `Ads` 页在进入后会对 agent 创建的 ad records 做焦点/可见性轻量刷新
- `AccountOverviewSheet` 的账号切换改成草稿态到提交态，降低自动化与实际交互的竞态
- 本地 agent API 允许 localhost 专用 token，避免 E2E 依赖真实公网 secret

## 8. 本轮修复的问题

- 修复 `Home` 已拍任务从状态抽屉打开复盘时，复盘弹窗被同层抽屉遮挡的问题
- 修复 `Upload complete` 在本地 Worker + 真实 R2 组合下只依赖 `BUCKET.head()` 导致误判对象不存在的问题
- 改进 `SwipeableTask`，补上桌面端 `pointer` 拖拽支持
- 改进 `Archive` 颜色设置开关，改成可访问的 `role="switch"` 按钮，避免隐藏 checkbox 的交互歧义
- 修复 `Home` 上方账号 tab 与下方账号卡轮播在初始化、数据刷新和横向滚动时可能失去同步的问题

## 9. 最近一次执行结果

- 执行日期：`2026-03-14`
- 执行命令：`npm run e2e`
- 结果：`18 passed`
- 总耗时：约 `25.7s`

覆盖通过的业务流：

- `Home` 账号切换、上方账号 tab / 下方账号卡轮播同步、账号新增、编辑、任务创建、编辑、显式排序模式、状态流转、复盘保存、全局任务总数与概览范围切换
- `Archive` 搜索、任务创建、编辑、删除、显式排序模式、显示设置持久化、备注字段文案更新
- `Ads` 收入记录、投放记录、结算切换、编辑、删除、筛选、月份切换
- `Agent API` 鉴权、账号列表、账号解析、任务查询、今日任务视图、投放/收益查询、月度汇总、批量创建、幂等重放、页面自动同步
- `Guides` 三个页面的操作提示卡关闭持久化与重新打开
- `Upload` 实时封面预览、封面位置确认、Worker 签名、R2 PUT、Worker complete、资产 URL 可读

## 10. 线上 smoke 现状

最近一次线上 smoke：

- 日期：`2026-03-12`
- 环境：`https://mam.midao.site`
- 方式：非破坏性手工浏览器烟测

已确认：

- 首页加载正常
- `账号一览` 可打开、切换、关闭
- 首页排序模式可进入和退出
- 归档页日期切换正常
- 归档页排序模式可进入和退出
- 投放页收入/投放切换正常
- 记录弹窗和月份弹窗可打开与关闭
- `GET /api/health` 返回 `{"ok":true}`

说明：

- 这轮线上 smoke 没有写入测试账号、测试任务、测试收入或测试图片
- 当前仍建议把真实写操作验证放在本地 D1 或未来的 staging 环境

## 11. 执行顺序

1. 重置本地 D1
2. 启动本地 dev server
3. 跑自动化回归
4. 跑上传链路烟测
5. 失败即修复并回归

## 12. 产出物

- 本文档：行为测试范围与通过标准
- `docs/e2e-test-todo.md`：执行清单
- `tests/e2e/`：可执行用例
- `playwright.config.ts`：测试运行配置
