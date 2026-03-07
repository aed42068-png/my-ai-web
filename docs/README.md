# Docs Index

这个目录沉淀了当前项目在 Cloudflare 上的架构决策、Wrangler 使用方式和落地运行手册。

推荐阅读顺序：

1. [Cloudflare Architecture](./cloudflare-architecture.md)
2. [Wrangler CLI Guide](./wrangler-cli-guide.md)
3. [Setup And Deploy Runbook](./setup-and-deploy-runbook.md)
4. [E2E Behavior Test Plan](./e2e-behavior-test-plan.md)
5. [E2E Test Todo](./e2e-test-todo.md)
6. [Project AGENTS](../AGENTS.md)

文档目标：

- 解释为什么当前项目选择 `Workers Static Assets + Hono + D1 + R2`
- 明确 `Wrangler CLI` 在这个仓库里的职责边界
- 把本地开发、资源初始化、迁移、部署、调试流程固化下来
- 把 E2E 行为测试范围、执行清单和回归策略沉淀下来
- 给 AI / 自动化代理提供项目级操作依据
