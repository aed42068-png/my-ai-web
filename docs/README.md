# Docs Index

这个目录沉淀了当前项目在 Cloudflare 上的架构决策、Wrangler 使用方式和落地运行手册。

推荐阅读顺序：

1. [Current Product Status](./current-product-status.md)
2. [Cloudflare Architecture](./cloudflare-architecture.md)
3. [Agent API](./agent-api.md)
4. [Agent Skill Sync Workflow](./agent-skill-sync-workflow.md)
5. [OpenClaw Remote Skill Setup](./openclaw-remote-skill-setup.md)
6. [Wrangler CLI Guide](./wrangler-cli-guide.md)
7. [Setup And Deploy Runbook](./setup-and-deploy-runbook.md)
8. [E2E Behavior Test Plan](./e2e-behavior-test-plan.md)
9. [E2E Test Todo](./e2e-test-todo.md)
10. [Project AGENTS](../AGENTS.md)

文档目标：

- 解释为什么当前项目选择 `Workers Static Assets + Hono + D1 + R2`
- 记录对外开放给 OpenClaw/skills 的 agent-facing API 约定
- 记录 agent API 变化后如何同步到独立 skill 仓库
- 记录当前项目已经完成到什么程度，以及线上实际启用的功能
- 明确 `Wrangler CLI` 在这个仓库里的职责边界
- 把本地开发、资源初始化、迁移、部署、调试流程固化下来
- 把 E2E 行为测试范围、执行清单和回归策略沉淀下来
- 给 AI / 自动化代理提供项目级操作依据
