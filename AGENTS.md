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
2. [docs/cloudflare-architecture.md](/Users/xiaohao-mini/Code/my-ai-web/docs/cloudflare-architecture.md)
3. [docs/setup-and-deploy-runbook.md](/Users/xiaohao-mini/Code/my-ai-web/docs/setup-and-deploy-runbook.md)
4. [docs/e2e-behavior-test-plan.md](/Users/xiaohao-mini/Code/my-ai-web/docs/e2e-behavior-test-plan.md)

## Current Architecture

- Static assets are served by Workers Static Assets from `dist/client`
- API routes live in [worker/index.ts](/Users/xiaohao-mini/Code/my-ai-web/worker/index.ts)
- Frontend data bootstraps in [src/App.tsx](/Users/xiaohao-mini/Code/my-ai-web/src/App.tsx)
- D1 schema lives in [migrations/0001_init.sql](/Users/xiaohao-mini/Code/my-ai-web/migrations/0001_init.sql)
- Cloudflare bindings live in [wrangler.jsonc](/Users/xiaohao-mini/Code/my-ai-web/wrangler.jsonc)

Key runtime model:

- `accounts` and `tasks` load on app boot
- `ad_records` are lazy-loaded when entering the Ads tab
- bootstrap cache uses `localStorage` with TTL and silent refresh
- image uploads go `Browser -> Worker sign -> direct PUT to R2 -> Worker complete -> D1`

## Product Areas

### Home

- account switching
- account creation and editing
- task create/edit/delete
- task status flow
- task review save

### Archive

- date-based task view
- search
- task create/edit/delete
- display settings persisted in `localStorage`

### Ads

- account-based income/expense view
- month switching
- income settlement filtering
- ad record create/edit/delete
- income settlement quick toggle

## Important Files

- [src/App.tsx](/Users/xiaohao-mini/Code/my-ai-web/src/App.tsx): app bootstrap, shared state, cache, tab routing
- [src/pages/Home.tsx](/Users/xiaohao-mini/Code/my-ai-web/src/pages/Home.tsx): home workflows
- [src/pages/Archive.tsx](/Users/xiaohao-mini/Code/my-ai-web/src/pages/Archive.tsx): archive workflows
- [src/pages/Ads.tsx](/Users/xiaohao-mini/Code/my-ai-web/src/pages/Ads.tsx): ads workflows
- [src/lib/api.ts](/Users/xiaohao-mini/Code/my-ai-web/src/lib/api.ts): frontend API client and upload helpers
- [src/types.ts](/Users/xiaohao-mini/Code/my-ai-web/src/types.ts): shared types across UI and Worker
- [worker/index.ts](/Users/xiaohao-mini/Code/my-ai-web/worker/index.ts): Hono API and upload signing

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

## Safety Notes

- Local D1 is safe for CRUD during `npm run dev`
- R2 uploads in local development hit the real bucket unless you explicitly change bindings
- Build output from `@cloudflare/vite-plugin` may temporarily materialize `.dev.vars`; project scripts scrub it automatically
- If you ever inspect `dist/my_ai_web/.dev.vars`, treat exposed keys as compromised and rotate them

## Testing Expectations

For UI or API changes:

1. Run `npm run lint`
2. Run `npm run e2e`

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

## Known Caveats

- Local Cloudflare runtime currently falls back from compatibility date `2026-03-06` to `2026-03-01`
- This is a local tooling mismatch, not a production outage
- If changes depend on very new Workers behavior, verify with updated Wrangler/runtime or production smoke tests

## When Docs Must Be Updated

Update docs whenever you change:

- API surface
- Cloudflare bindings or deploy flow
- upload/storage behavior
- E2E coverage or test commands
- product behavior in Home, Archive, or Ads
