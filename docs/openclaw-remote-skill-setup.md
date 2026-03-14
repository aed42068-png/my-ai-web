# OpenClaw Remote Skill Setup

## 1. 适用场景

这份文档用于把当前仓库里的 `mam-task` skill 部署到**另一台运行 OpenClaw 的机器**。

适合这种情况：

- 应用代码在这台机器
- OpenClaw 在另一台机器
- 你希望 OpenClaw 继续调用 `https://mam.midao.site` 的 agent API

## 2. 需要带到远程机器的内容

只需要复制这个目录：

- [skills/mam-task](/Users/xiaohao-mini/Code/my-ai-web/skills/mam-task)

目录里包含：

- `SKILL.md`
- `scripts/mam-task.mjs`

当前脚本支持：

- `list-accounts`
- `resolve-account`
- `list-tasks`
- `list-today`
- `list-ad-records`
- `list-ad-records-monthly`
- `check-batch`
- `create-batch`
- `check-ad-records-batch`
- `create-ad-records-batch`

当前提示词约定：

- 用户自然语言里说“备注 / 说明 / 补充说明”时，skill 会把它理解为任务备注
- 当前接口 payload 仍使用历史字段名 `location`
- 这里的 `location` 不是地理位置语义，而是兼容历史字段名的任务备注

不要只复制脚本，不复制 `SKILL.md`。OpenClaw 需要 `SKILL.md` 才能识别 skill。

## 3. 本机打包方式

在当前仓库执行：

```bash
cd /Users/xiaohao-mini/Code/my-ai-web/skills
zip -r mam-task.zip mam-task
```

生成后的文件：

- `mam-task.zip`

把这个 zip 传到 OpenClaw 所在机器。

## 4. 远程机器解压

在远程机器上任选一个目录，例如：

- `~/openclaw-skills`

然后执行：

```bash
mkdir -p ~/openclaw-skills
cd ~/openclaw-skills
unzip mam-task.zip
```

解压后应当能看到：

- `~/openclaw-skills/mam-task/SKILL.md`

## 5. 配置 openclaw.json

如果远程机器使用全局配置，通常写到：

- `~/.openclaw/openclaw.json`

可直接使用下面这个模板：

```json
{
  "skills": {
    "load": {
      "extraDirs": [
        "/home/你的用户名/openclaw-skills"
      ],
      "watch": true,
      "watchDebounceMs": 250
    },
    "entries": {
      "mam-task": {
        "enabled": true,
        "env": {
          "MAM_AGENT_API_BASE_URL": "https://mam.midao.site",
          "MAM_AGENT_API_TOKEN": "替换成你的_AGENT_API_TOKEN"
        }
      }
    }
  }
}
```

如果 skill 放在别的目录，只改 `extraDirs` 即可。

## 6. Token 配置

远程机器需要注入：

- `MAM_AGENT_API_BASE_URL=https://mam.midao.site`
- `MAM_AGENT_API_TOKEN=<你的 AGENT_API_TOKEN>`

建议：

- token 只放在 `openclaw.json` 的 `env` 或 OpenClaw 支持的 secret/env 注入机制中
- 不要写进 `SKILL.md`
- 不要提交到 Git 仓库

## 7. 生产端前置条件

远程 skill 真正可调用前，生产 Worker 需要先完成：

1. 远程 D1 migration

```bash
npx wrangler d1 migrations apply my-ai-web --remote
```

2. 写入生产 secret

```bash
printf '%s' '你的token' | npx wrangler secret put AGENT_API_TOKEN
```

## 8. 验证方式

最小验证分两步：

### 8.1 resolve 账号

让 OpenClaw 或远程 shell 调用：

```bash
node /你的路径/mam-task/scripts/mam-task.mjs resolve-account "年轻朋友阿甜"
```

预期返回：

```json
{
  "match": "exact",
  "account": {
    "id": "acc_travel",
    "name": "年轻朋友阿甜"
  }
}
```

### 8.2 创建任务

```bash
cat <<'JSON' | node /你的路径/mam-task/scripts/mam-task.mjs create-batch
{
  "source": "openclaw",
  "timezone": "Asia/Shanghai",
  "rawText": "年轻朋友阿甜明天发豆包广告，备注：先出一版轻口播",
  "tasks": [
    {
      "accountId": "acc_travel",
      "title": "豆包广告发布",
      "date": "2026-03-14",
      "status": "待拍",
      "location": "先出一版轻口播"
    }
  ]
}
JSON
```

预期返回：

- `requestId`
- `created`
- `skipped`

脚本会在真正写入前先查询同账号同日期任务，并自动跳过标题重复的任务。

这里的 `location` 是当前接口里的历史字段名，语义上代表任务备注。

### 8.3 只做重复检查

```bash
cat <<'JSON' | node /你的路径/mam-task/scripts/mam-task.mjs check-batch
{
  "source": "openclaw",
  "timezone": "Asia/Shanghai",
  "rawText": "年轻朋友阿甜明天发豆包广告，备注：先出一版轻口播",
  "tasks": [
    {
      "accountId": "acc_travel",
      "title": "豆包广告发布",
      "date": "2026-03-14",
      "status": "待拍",
      "location": "先出一版轻口播"
    }
  ]
}
JSON
```

预期返回：

- `duplicateCheck`
- `submittedCount`
- `duplicateCount`

### 8.4 记录投放或收益

```bash
cat <<'JSON' | node /你的路径/mam-task/scripts/mam-task.mjs create-ad-records-batch
{
  "source": "openclaw",
  "timezone": "Asia/Shanghai",
  "rawText": "年轻朋友阿甜今天投了 300 元豆包广告，备注：先跑冷启动",
  "records": [
    {
      "accountId": "acc_travel",
      "title": "豆包广告投放",
      "date": "2026-03-14",
      "type": "expense",
      "amount": 300,
      "note": "先跑冷启动"
    }
  ]
}
JSON
```

预期返回：

- `requestId`
- `created`
- `skipped`

脚本会在真正写入前先查询同账号同日期 ad records，并自动跳过标题、类型、金额都相同的重复记录。

## 9. 常见问题

### 9.1 skill 不显示

优先检查：

- `extraDirs` 指向的目录是否正确
- 目录里是否真的有 `mam-task/SKILL.md`
- OpenClaw 是否重启或新开 session

### 9.2 resolve 或 create 返回 401/403

说明通常是：

- `MAM_AGENT_API_TOKEN` 没配置
- token 配错
- 生产 Worker 还没写入 `AGENT_API_TOKEN`

### 9.3 create 返回 500

优先检查：

- 生产 Worker 是否已部署到最新版本
- `0002_agent_requests.sql` 是否已经远程执行
- `AGENT_API_TOKEN` 是否已写入 Worker secret

## 10. 相关文件

- [docs/agent-api.md](/Users/xiaohao-mini/Code/my-ai-web/docs/agent-api.md)
- [skills/mam-task/SKILL.md](/Users/xiaohao-mini/Code/my-ai-web/skills/mam-task/SKILL.md)
- [skills/mam-task/scripts/mam-task.mjs](/Users/xiaohao-mini/Code/my-ai-web/skills/mam-task/scripts/mam-task.mjs)
