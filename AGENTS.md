# AGENTS.md

## Project Snapshot

- Project name: `my-ai-web`
- Product shape: single-user content operations dashboard
- Frontend: `Vite + React`
- Backend: `Cloudflare Workers + Hono`
- Database: `D1`
- File storage: `R2`
- Deploy target: single Worker with Static Assets on `mam.midao.site`

## Read This First

Before making non-trivial changes, read:

1. [README.md](/Users/xiaohao-mini/Code/my-ai-web/README.md)
2. [docs/current-product-status.md](/Users/xiaohao-mini/Code/my-ai-web/docs/current-product-status.md)
3. [docs/cloudflare-architecture.md](/Users/xiaohao-mini/Code/my-ai-web/docs/cloudflare-architecture.md)
4. [docs/agent-api.md](/Users/xiaohao-mini/Code/my-ai-web/docs/agent-api.md)
5. [docs/agent-skill-sync-workflow.md](/Users/xiaohao-mini/Code/my-ai-web/docs/agent-skill-sync-workflow.md)
6. [docs/setup-and-deploy-runbook.md](/Users/xiaohao-mini/Code/my-ai-web/docs/setup-and-deploy-runbook.md)
7. [docs/e2e-behavior-test-plan.md](/Users/xiaohao-mini/Code/my-ai-web/docs/e2e-behavior-test-plan.md)

## Current Architecture

- Static assets are served by Workers Static Assets from `dist/client`
- API routes live in [worker/index.ts](/Users/xiaohao-mini/Code/my-ai-web/worker/index.ts)
- Frontend data bootstraps in [src/App.tsx](/Users/xiaohao-mini/Code/my-ai-web/src/App.tsx)
- D1 schema and follow-up migrations live in [migrations](/Users/xiaohao-mini/Code/my-ai-web/migrations)
- Cloudflare bindings live in [wrangler.jsonc](/Users/xiaohao-mini/Code/my-ai-web/wrangler.jsonc)

Key runtime model:

- `accounts` and `tasks` load on app boot
- `accounts` and `tasks` silently refresh on window focus, visibility return, and a 60-second visible-page interval
- `ad_records` are lazy-loaded when entering the Ads tab
- bootstrap cache uses `localStorage` with TTL and silent refresh
- image uploads go `Browser -> Worker sign -> direct PUT to R2 -> Worker complete -> D1`
- external AI writes go through `/api/agent/*`, not the browser CRUD endpoints
- agent task writes require Bearer auth, `Idempotency-Key`, and are audited in `agent_requests`
- page guides persist dismissal state in `localStorage`

## Current Delivery State

As of `2026-03-14`:

- production domain is live at `https://mam.midao.site`
- current product is already API-driven and no longer a front-end-only prototype
- local E2E coverage currently passes with `14 passed`
- a non-destructive production smoke pass has already been run manually
- Home/Archive/Ads all have onboarding guides, explicit sort entry points, and mobile spacing refinements
- Playwright E2E now defaults to Chromium-based `iPhone 12 Pro` emulation; treat mobile layout as the primary regression surface
- agent-facing query/write API is implemented and covered by local E2E
- a workspace OpenClaw-ready skill now exists at [skills/mam-task/SKILL.md](/Users/xiaohao-mini/Code/my-ai-web/skills/mam-task/SKILL.md)
- the `mam-task` skill now supports read-before-write task checks and skips exact same-day duplicates before batch creation
- task forms now use `备注` as the user-facing copy while the stored/API field remains `location`
- Home summary now supports `当前账号 / 全部账号` scope switching and shows a global task total alongside the current-account count

## Product Areas

### Home

- account switching
- Home reflects agent-created tasks through focus/visibility/interval refresh; keep these refreshes lightweight and limited to `accounts + tasks`
- horizontal account swipe stays synced with active account content
- top account tab clicks and lower card carousel scrolling stay locked together during init and data refresh; do not reintroduce delayed scroll effects that can override an explicit selection
- account overview sheet for explicit account selection and ordering
- account overview selection is draft-only until submit; do not reintroduce immediate page mutation on item click
- account creation and editing
- home account cards use an inset preview treatment so uploaded covers do not feel overly zoomed
- mobile header/footer have already been compressed to preserve first-screen space
- the Home account action row must remain mobile-first; keep it in a compact stacked/grid layout instead of forcing title + three actions onto one line
- dismissible usage guide with localStorage persistence
- task create/edit/delete
- task forms use `备注` as the user-facing label while preserving `location` in the API payload
- summary cards support `当前账号 / 全部账号` scope switching
- task arrangement shows both current-account count and a global total badge
- task status advances via dedicated progress dot
- explicit task sort mode with drag reorder
- task status flow
- task review save

### Archive

- date-based task view
- dismissible usage guide with localStorage persistence
- search supports explicit submit via Enter or confirm button
- search
- task create/edit/delete
- task forms use `备注` as the user-facing label while preserving `location` in the API payload
- explicit task sort mode for same-status tasks
- display settings persisted in `localStorage`
- archive layout uses a single main scroll region; do not move the full calendar back into a permanently fixed area

### Ads

- account-based income/expense view
- dismissible usage guide with localStorage persistence
- empty-state onboarding for first-time setup
- top hero uses current account screenshot as the main background
- the Ads hero must stay readable under mobile emulation; keep account controls and summary numbers compact enough for narrow widths
- income is styled with yellow/gold accents, expense with red accents
- records are lazy-loaded only after entering the Ads tab
- month switching
- income settlement filtering
- ad record create/edit/delete
- income settlement quick toggle

### Agent API

- external agent traffic lives under `/api/agent/*`
- `GET /api/agent/accounts` lists resolvable accounts for agent callers
- `GET /api/agent/accounts/resolve` returns `exact / not_found / ambiguous`
- `GET /api/agent/tasks` and `GET /api/agent/tasks/today` provide read-only task lookup for agents
- `POST /api/agent/tasks/batch` remains the only public write API in v1
- do not let external agents write through `/api/tasks`
- keep Worker-side parsing strictly structural; natural-language understanding belongs in the caller skill
- do not remove idempotency or agent request auditing

## Important Files

- [src/App.tsx](/Users/xiaohao-mini/Code/my-ai-web/src/App.tsx): app bootstrap, shared state, cache, tab routing
- [src/pages/Home.tsx](/Users/xiaohao-mini/Code/my-ai-web/src/pages/Home.tsx): home workflows
- [src/pages/Archive.tsx](/Users/xiaohao-mini/Code/my-ai-web/src/pages/Archive.tsx): archive workflows
- [src/pages/Ads.tsx](/Users/xiaohao-mini/Code/my-ai-web/src/pages/Ads.tsx): ads workflows
- [src/components/AccountOverviewSheet.tsx](/Users/xiaohao-mini/Code/my-ai-web/src/components/AccountOverviewSheet.tsx): explicit account selection + ordering draft sheet
- [src/components/PageGuide.tsx](/Users/xiaohao-mini/Code/my-ai-web/src/components/PageGuide.tsx): reusable dismissible usage guide
- [src/components/AccountEditorModal.tsx](/Users/xiaohao-mini/Code/my-ai-web/src/components/AccountEditorModal.tsx): account editing, upload preview, cover confirmation
- [src/components/ImagePositioner.tsx](/Users/xiaohao-mini/Code/my-ai-web/src/components/ImagePositioner.tsx): cover positioning drag + slider fallback
- [src/lib/api.ts](/Users/xiaohao-mini/Code/my-ai-web/src/lib/api.ts): frontend API client and upload helpers
- [src/types.ts](/Users/xiaohao-mini/Code/my-ai-web/src/types.ts): shared types across UI and Worker
- [worker/index.ts](/Users/xiaohao-mini/Code/my-ai-web/worker/index.ts): Hono API and upload signing
- [migrations/0002_agent_requests.sql](/Users/xiaohao-mini/Code/my-ai-web/migrations/0002_agent_requests.sql): agent API idempotency + audit table
- [docs/agent-api.md](/Users/xiaohao-mini/Code/my-ai-web/docs/agent-api.md): external AI integration contract
- [docs/agent-skill-sync-workflow.md](/Users/xiaohao-mini/Code/my-ai-web/docs/agent-skill-sync-workflow.md): required workflow when agent API or `mam-task` skill changes
- [docs/openclaw-remote-skill-setup.md](/Users/xiaohao-mini/Code/my-ai-web/docs/openclaw-remote-skill-setup.md): how to move the workspace skill onto another OpenClaw machine
- [skills/mam-task/SKILL.md](/Users/xiaohao-mini/Code/my-ai-web/skills/mam-task/SKILL.md): workspace skill for OpenClaw-style task intake
- [skills/mam-task/scripts/mam-task.mjs](/Users/xiaohao-mini/Code/my-ai-web/skills/mam-task/scripts/mam-task.mjs): deterministic helper for account resolve + batch create

## Commands

Install:

```bash
npm install
```

Local dev:

```bash
npm run dev
```

Local D1 migration:

```bash
npm run db:migrate:local
```

Typecheck:

```bash
npm run lint
```

E2E:

```bash
npm run e2e
npm run e2e:headed
```

Note:

- Both commands now run under Playwright mobile emulation (`iPhone 12 Pro` metrics in Chromium) by default

Build:

```bash
npm run build
```

Preview built Worker:

```bash
npm run preview
```

Deploy:

```bash
npm run deploy
```

## Environment Rules

- Do not commit `.dev.vars`
- Do not place secrets in `wrangler.jsonc`
- Sensitive values must use Worker secrets in production
- Non-sensitive Cloudflare vars are configured in `wrangler.jsonc`

Current real resources:

- app domain: `https://mam.midao.site`
- asset domain: `https://assets-tian.midao.site`
- R2 bucket: `tian`
- D1 database: `my-ai-web`

Agent auth:

- production secret: `AGENT_API_TOKEN`
- localhost-only fallback token for development/E2E: `dev-agent-token`

## Safety Notes

- Local D1 is safe for CRUD during `npm run dev`
- R2 uploads in local development hit the real bucket unless you explicitly change bindings
- local agent API tests do not require a real secret because localhost accepts `dev-agent-token`
- Build output from `@cloudflare/vite-plugin` may temporarily materialize `.dev.vars`; project scripts scrub it automatically
- If you ever inspect `dist/my_ai_web/.dev.vars`, treat exposed keys as compromised and rotate them

## Testing Expectations

For UI or API changes:

1. Run `npm run lint`
2. Run `npm run e2e`
3. Treat the mobile-emulated result as the primary pass/fail signal for layout and interaction regressions

For production deploys or release fixes:

1. Run `npm run deploy`
2. Verify `https://mam.midao.site/api/health`
3. Prefer a non-destructive online smoke pass over real production writes

For upload, routing, or Worker config changes:

1. Run `npm run build`
2. If needed, run `npm run preview`

## Editing Expectations

- Keep the current architecture: `Workers Static Assets + Hono + D1 + R2`
- Prefer extending shared types before adding duplicate local types
- Preserve same-origin `/api/*` calls from the frontend
- Do not reintroduce large client-only mock state as the primary source of truth
- Do not expose development-only debug UI in production
- When updating upload flow, verify both frontend and Worker paths
- Keep external AI integration behind `/api/agent/*`; do not bolt public auth onto the browser CRUD endpoints
- When `/api/agent/*` or `mam-task` changes in a way that affects the skill contract, update the main-repo skill docs, sync `/Users/xiaohao-mini/Code/atian-skills`, then `git commit` and `git push` that repo unless the user explicitly asks not to

## Known Caveats

- Local Cloudflare runtime currently falls back from compatibility date `2026-03-06` to `2026-03-01`
- This is a local tooling mismatch, not a production outage
- If changes depend on very new Workers behavior, verify with updated Wrangler/runtime or production smoke tests
- Production smoke has been run manually in a non-destructive way; there is not yet a standalone scripted production smoke suite

## When Docs Must Be Updated

Update docs whenever you change:

- API surface
- Cloudflare bindings or deploy flow
- upload/storage behavior
- E2E coverage or test commands
- product behavior in Home, Archive, or Ads
- skill behavior, skill install flow, or the sync process between this repo and `/Users/xiaohao-mini/Code/atian-skills`
