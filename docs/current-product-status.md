# Current Product Status

## 1. 当前结论

截至 `2026-03-12`，当前仓库已经不是前端原型，而是可运行的单人内容运营后台：

- 生产域名：`https://mam.midao.site`
- 架构：`Workers Static Assets + Hono + D1 + R2`
- 图片上传：`Browser -> Worker sign -> direct PUT to R2 -> Worker complete -> D1`
- 数据源：前端已完全切到真实 API，不再以内存 mock state 作为主数据源

当前状态适合：

- 单人自用
- 内部运营后台
- 持续迭代中的生产环境

当前仍未覆盖的产品级能力：

- 账号删除
- 资产删除 / 清理
- 多用户权限
- 公开产品化鉴权体系

## 2. 最近这轮大改的核心结果

### 2.1 Home

`Home` 已经从“账号卡 + 任务列表”升级成可用的任务工作台：

- 账号横滑与下方任务内容保持同步
- 点击上方账号 tab 与下方账号卡轮播会双向同步，初始化与数据刷新阶段也不会再把显式选择抢回旧账号
- 新增了 `账号一览` 抽屉，用于显式切换账号和保存账号顺序
- 账号一览里的账号选择改成“抽屉内预选，点击完成才提交”，避免即时切换带来的时序抖动
- 任务状态改成左侧圆点推进，不再靠整张卡片隐式切换
- 任务排序改成显式 `排序任务` 模式，进入后才允许拖动
- 页面加入可关闭并持久化的操作提示卡
- 首页账号大卡改成“外层氛围背景 + 内层截图预览”结构，避免封面看起来被过度放大
- 首页 header / footer 已压缩，移动端首屏可用区域更大
- 首页“账号管理”操作区已改成移动端优先的两行紧凑布局，避免标题和按钮在窄屏下互相挤压换行

### 2.2 Archive

`Archive` 现在已经具备完整的归档查询与编辑闭环：

- 归档页支持日期浏览
- 搜索支持 `Enter` 和“确定”按钮提交
- 任务支持新增、编辑、删除
- 同状态任务支持显式排序模式
- 颜色显示设置会持久化到 `localStorage`
- 页面也有首次使用引导卡，并支持关闭后重新打开
- 归档页布局已修正为主内容单滚动，不再出现日历占满视口的问题

### 2.3 Ads

`Ads` 已从“只会新增记录”的页面变成完整的收入/投放管理页：

- 顶部主卡直接使用当前账号截图作为背景
- 收入使用黄/金色系，投放使用红色系
- 顶部 hero 已做移动端收敛：账号控件支持窄屏换行，金额字号按手机宽度自适应缩小
- 记录支持新增、编辑、删除
- 收入记录支持快速切换 `已结算 / 未结算`
- 记录筛选、月份切换都已闭环
- 账号封面编辑已接入同一套上传逻辑
- 页面带首次使用引导卡，并支持关闭持久化
- 顶部 header 已压缩，避免过高占屏

### 2.4 Shared / UX

当前项目已经补齐了几类关键 UX 基线：

- 启动支持本地缓存 + 静默刷新，首屏不再强依赖空白加载
- 开发环境缓存调试条已隐藏，不会泄露到生产
- 上传封面有明确过程态：`上传封面中... / 保存账号中...`
- 上传成功提示统一为 `上传成功`
- `[object Object]` 类错误文案已被修复为可读错误
- 移动端顶部和底部导航高度已压缩

## 3. 当前线上资源

- app domain: `https://mam.midao.site`
- asset domain: `https://assets-tian.midao.site`
- R2 bucket: `tian`
- D1 database: `my-ai-web`

当前线上图片上传链路、D1 读写、站点健康检查都已验证通过。

## 4. 当前测试与验证状态

### 4.1 本地自动化

当前 E2E 自动化共 `8` 条用例，分布在：

- `tests/e2e/home.spec.ts`
- `tests/e2e/archive.spec.ts`
- `tests/e2e/ads.spec.ts`
- `tests/e2e/guides.spec.ts`
- `tests/e2e/upload.spec.ts`

最近一次本地全量结果：

- 日期：`2026-03-12`
- 命令：`npm run e2e`
- 结果：`8 passed`
- 总耗时：约 `21.0s`
- 默认设备：Playwright `iPhone 12 Pro` 移动端模拟（运行在 Chromium）

### 4.2 线上烟测

在 `2026-03-12` 已完成一轮非破坏性生产烟测：

- 首页加载正常
- `账号一览` 可打开、切换、关闭
- 首页排序模式可进入和退出
- 归档页日期切换正常
- 归档页排序模式可进入和退出
- 投放页收入/投放切换正常
- 记录弹窗可打开和关闭
- 月份弹窗可打开和关闭
- `GET /api/health` 返回 `{"ok":true}`

说明：

- 这轮线上 smoke 刻意没有写入测试数据
- 没有在线上创建测试账号、测试任务、测试收入或测试图片
- 真实写操作仍建议优先在本地 D1 或 staging 环境验证

## 5. 当前主要文档应该怎么读

推荐顺序：

1. [README.md](/Users/xiaohao-mini/Code/my-ai-web/README.md)
2. [current-product-status.md](/Users/xiaohao-mini/Code/my-ai-web/docs/current-product-status.md)
3. [cloudflare-architecture.md](/Users/xiaohao-mini/Code/my-ai-web/docs/cloudflare-architecture.md)
4. [setup-and-deploy-runbook.md](/Users/xiaohao-mini/Code/my-ai-web/docs/setup-and-deploy-runbook.md)
5. [e2e-behavior-test-plan.md](/Users/xiaohao-mini/Code/my-ai-web/docs/e2e-behavior-test-plan.md)
6. [AGENTS.md](/Users/xiaohao-mini/Code/my-ai-web/AGENTS.md)

## 6. 当前最重要的工程约束

- 保持 `Workers Static Assets + Hono + D1 + R2` 架构，不要回退到大块前端 mock state
- `ad_records` 继续保持按需懒加载，不要恢复为首屏全量请求
- 账号封面展示要尽量与编辑弹窗里的预览比例一致，避免首页卡片出现过度放大感
- `账号一览` 的账号选择是“先预选，再提交”，不要再改回点击即立即切换底层页面
- 任务排序必须保持显式模式，不要让拖拽排序和左滑删除在同一个默认状态里打架
- 生产环境不要暴露开发缓存调试 UI

## 7. 剩余明显缺口

当前还值得继续补的点：

- `Home` 非归档页删除路径的独立 E2E
- `Archive` 日期切换的明确断言
- `pageerror / console` 级别断言
- 单独的线上 smoke test 脚本
- `staging` 环境与独立 preview bucket
- Cloudflare Access 保护后台

如果后续有人继续接手，优先不要再重复做架构层重构，而是沿着这几项收口。
