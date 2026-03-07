# E2E Behavior Test Plan

## 1. 目标

这份文档定义当前项目的端到端行为测试范围、验收标准、自动化边界和执行方式。

当前项目的核心目标不是做“静态页面截图回归”，而是验证下面 4 条业务链路在真实浏览器里是否完整闭环：

- 首页 `Home`：账号管理、任务创建/编辑/删除、任务状态流转、复盘保存
- 归档页 `Archive`：按日期查看、搜索、创建/编辑/删除任务、归档显示设置
- 投放页 `Ads`：账号切换、收入/投放记录创建、编辑、删除、结算切换、月份切换、收入状态筛选
- 上传链路：浏览器 -> Worker `sign` -> R2 `PUT` -> Worker `complete` -> D1 落库 -> 资产域名可读

## 2. 测试环境

### 2.1 本地运行基线

- 前端与 Worker：`npm run dev`
- 本地数据库：Wrangler local D1
- 本地数据库初始化：`npm run db:migrate:local`
- 浏览器自动化：
  - 探索式验证：`agent-browser`
  - 可执行回归：`@playwright/test`

### 2.4 当前自动化入口

- 本地回归命令：`npm run e2e`
- 本地带界面调试：`npm run e2e:headed`
- 测试报告：`npm run e2e:report`
- Playwright 配置文件：[playwright.config.ts](/Users/xiaohao-mini/Code/my-ai-web/playwright.config.ts)
- 测试目录：[tests/e2e](/Users/xiaohao-mini/Code/my-ai-web/tests/e2e)

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
- 首页复盘保存可用
- 首页账号新增和编辑名称可用
- 归档页按日期查看、搜索、任务 CRUD 可用
- 归档页显示设置保存到 `localStorage` 后刷新仍生效
- 投放页收入记录新增、编辑、删除、结算切换、筛选切换、月份切换可用
- Worker API 健康检查可用

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
- 新增账号成功并持久化显示
- 编辑账号名称成功
- 新建任务成功
- 修改任务成功
- 删除任务成功
- 待拍任务点击后流转到已拍
- 已拍任务可打开复盘并保存

### 4.2 Archive

- 从底部导航进入归档页成功
- 日期切换后任务列表变化正确
- 搜索能按任务标题/复盘/账号名称命中
- 在归档页新增任务成功
- 在归档页修改任务成功
- 在归档页删除任务成功
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

- 通过 UI 选择图片文件
- Worker 成功返回 presigned URL
- 浏览器成功 PUT 到 R2
- `complete` 返回资产元数据
- 资产域名返回 `200` 且 `content-type` 正确

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

- [tests/e2e/home.spec.ts](/Users/xiaohao-mini/Code/my-ai-web/tests/e2e/home.spec.ts)
- [tests/e2e/archive.spec.ts](/Users/xiaohao-mini/Code/my-ai-web/tests/e2e/archive.spec.ts)
- [tests/e2e/ads.spec.ts](/Users/xiaohao-mini/Code/my-ai-web/tests/e2e/ads.spec.ts)
- [tests/e2e/upload.spec.ts](/Users/xiaohao-mini/Code/my-ai-web/tests/e2e/upload.spec.ts)

为了让这些用例稳定运行，项目已补充：

- 关键交互的 `data-testid`
- 重复图标按钮的 `aria-label`
- Playwright Web Server 与本地 D1 migration 启动逻辑
- E2E 测试产物目录 `output/playwright/`
- 浏览器上传完成后的重试逻辑
- Worker 对 R2 上传完成校验的双路径兜底
- `Ads` 页新增了记录编辑、删除和结算状态快速切换路径

## 8. 本轮修复的问题

- 修复 `Home` 已拍任务从状态抽屉打开复盘时，复盘弹窗被同层抽屉遮挡的问题
- 修复 `Upload complete` 在本地 Worker + 真实 R2 组合下只依赖 `BUCKET.head()` 导致误判对象不存在的问题
- 改进 `SwipeableTask`，补上桌面端 `pointer` 拖拽支持
- 改进 `Archive` 颜色设置开关，改成可访问的 `role="switch"` 按钮，避免隐藏 checkbox 的交互歧义

## 9. 最近一次执行结果

- 执行日期：`2026-03-07`
- 执行命令：`npm run e2e`
- 结果：`4 passed`
- 总耗时：约 `19.3s`

覆盖通过的业务流：

- `Home` 账号新增、编辑、任务创建、编辑、状态流转、复盘保存
- `Archive` 搜索、任务创建、编辑、删除、显示设置持久化
- `Ads` 收入记录、投放记录、结算切换、编辑、删除、筛选、月份切换
- `Upload` Worker 签名、R2 PUT、Worker complete、资产 URL 可读

## 10. 执行顺序

1. 重置本地 D1
2. 启动本地 dev server
3. 跑自动化回归
4. 跑上传链路烟测
5. 失败即修复并回归

## 11. 产出物

- 本文档：行为测试范围与通过标准
- `docs/e2e-test-todo.md`：执行清单
- `tests/e2e/`：可执行用例
- `playwright.config.ts`：测试运行配置
