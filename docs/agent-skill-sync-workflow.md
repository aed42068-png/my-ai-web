# Agent Skill Sync Workflow

## 1. 目的

这份文档定义一条固定规则：

当 `my-ai-web` 的接口或行为变化会影响 `mam-task` skill 时，必须同步更新：

- 主仓库内的 skill 实现和说明
- 独立 skill 仓库 `atian-skills`
- 远程 GitHub 仓库 `git@github.com:ITxiaohao/atian-skills.git`

目标不是“有空再同步”，而是把这条链路当成接口变更的收尾步骤。

## 2. 什么情况下必须同步

出现下面任一情况，就必须执行 skill 同步：

- `worker/index.ts` 里 `/api/agent/*` 的路由、参数、响应结构、错误语义发生变化
- `src/types.ts` 里 agent API 相关类型发生变化
- `mam-task` skill 的调用方式、命令、默认行为发生变化
- OpenClaw / skill 的环境变量、鉴权方式、幂等方式发生变化
- skill 依赖的去重逻辑、查询逻辑、写入逻辑发生变化
- 远程使用方式、安装方式、更新方式发生变化

如果改动只影响：

- 网页 UI
- 浏览器端 `/api/accounts`、`/api/tasks`、`/api/ad-records`
- 与 `mam-task` 无关的内部实现

则不需要强制同步 `atian-skills`。

## 3. 必须更新的文件

### 3.1 主仓库

至少检查并按需要更新：

- [skills/mam-task/SKILL.md](/Users/xiaohao-mini/Code/my-ai-web/skills/mam-task/SKILL.md)
- [skills/mam-task/scripts/mam-task.mjs](/Users/xiaohao-mini/Code/my-ai-web/skills/mam-task/scripts/mam-task.mjs)
- [docs/agent-api.md](/Users/xiaohao-mini/Code/my-ai-web/docs/agent-api.md)
- [docs/openclaw-remote-skill-setup.md](/Users/xiaohao-mini/Code/my-ai-web/docs/openclaw-remote-skill-setup.md)

按改动范围，通常也要顺手更新：

- [README.md](/Users/xiaohao-mini/Code/my-ai-web/README.md)
- [AGENTS.md](/Users/xiaohao-mini/Code/my-ai-web/AGENTS.md)
- [docs/current-product-status.md](/Users/xiaohao-mini/Code/my-ai-web/docs/current-product-status.md)

### 3.2 独立 skill 仓库

同步这些文件到：

- [/Users/xiaohao-mini/Code/atian-skills/skills/mam-task/SKILL.md](/Users/xiaohao-mini/Code/atian-skills/skills/mam-task/SKILL.md)
- [/Users/xiaohao-mini/Code/atian-skills/skills/mam-task/scripts/mam-task.mjs](/Users/xiaohao-mini/Code/atian-skills/skills/mam-task/scripts/mam-task.mjs)
- [/Users/xiaohao-mini/Code/atian-skills/README.md](/Users/xiaohao-mini/Code/atian-skills/README.md)

## 4. 推荐执行顺序

每次都按这个顺序做：

1. 先完成主仓库里的 API 或 skill 改动
2. 更新主仓库文档，让当前行为可读
3. 把 `skills/mam-task` 同步到 `atian-skills`
4. 根据需要更新 `atian-skills/README.md`
5. 做最小验证
6. 在 `atian-skills` 里执行 git 提交和 push

## 5. 最小验证清单

如果是 skill 或 agent API 相关改动，至少做这些验证中的适用项：

- `node skills/mam-task/scripts/mam-task.mjs --help`
- `list-accounts`
- `resolve-account`
- `list-tasks`
- `list-today`
- `check-batch`
- `create-batch --dry-run`

原则：

- 优先做非破坏性验证
- 能不用真实写入，就先不用真实写入
- 如果一定要写入，优先在本地或 staging 验证

## 6. 同步到 atian-skills 的方式

当前推荐直接从主仓库复制：

```bash
cp /Users/xiaohao-mini/Code/my-ai-web/skills/mam-task/SKILL.md /Users/xiaohao-mini/Code/atian-skills/skills/mam-task/SKILL.md
cp /Users/xiaohao-mini/Code/my-ai-web/skills/mam-task/scripts/mam-task.mjs /Users/xiaohao-mini/Code/atian-skills/skills/mam-task/scripts/mam-task.mjs
```

如果 `atian-skills` 的 README 也需要跟着更新，就在独立仓库里一起改。

## 7. Git 提交流程

同步完成后，在 `atian-skills` 仓库执行：

```bash
git -C /Users/xiaohao-mini/Code/atian-skills add README.md skills/mam-task/SKILL.md skills/mam-task/scripts/mam-task.mjs
git -C /Users/xiaohao-mini/Code/atian-skills commit -m "update mam-task after agent api change"
git -C /Users/xiaohao-mini/Code/atian-skills push
```

当前远程仓库：

- `git@github.com:ITxiaohao/atian-skills.git`

## 8. 文档优化要求

同步 skill 时，不要只复制脚本，文档也要一起优化。

至少保证这些信息是最新的：

- 当前支持的命令
- 当前需要的环境变量
- 当前默认行为
- 当前的重复检查逻辑
- 当前的错误或限制
- 当前的远程更新方式

如果只是接口改了，但 README 还是旧的，这次同步不算完成。

## 9. 对后续代理的默认要求

后续任何代理在修改 `agent API` 或 `mam-task` skill 时，默认应该：

1. 自动判断这次改动是否影响 skill
2. 如果影响，自动更新主仓库 skill 文档
3. 自动同步到 `atian-skills`
4. 自动执行 `git commit` 和 `git push`

只有在用户明确说“这次不要同步 skill 仓库”时，才可以跳过。
