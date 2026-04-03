# CoD Stats Tracker

CoD Stats Tracker is a Bun-based monorepo for a production web app and ChatGPT App connector focused on Call of Duty ranked tracking.

The product centers on two connected surfaces:

- a signed-in dashboard for creating ranked sessions, logging matches, and reviewing SR movement
- a ChatGPT App / MCP surface that exposes connected stats, match history, rank progress, and settings inside ChatGPT

## What The App Does

- Creates active ranked sessions for the current configured title and season
- Tracks matches against a real session and username, with backend ownership and validation
- Shows session summary, SR timeline, daily performance, win/loss breakdown, and recent matches
- Supports a flagged dashboard stats editor experience under `/dashboard`
- Lets users choose a preferred match logging flow:
  - `Comprehensive` for the full logging flow
  - `Basic` for the faster everyday path
- Exposes read-only stats and account actions through a ChatGPT App connector
- Includes optional billing and plan-aware behavior through Stripe

## How It Works

### Web App

- `apps/web` is a Next.js App Router app
- Clerk handles user authentication
- Feature flags decide which product surfaces are active, including the `dashboardStatsEditor` rollout

### Backend

- `packages/backend` contains Convex functions plus shared server helpers
- Convex is the source of truth for dashboard stats, session writes, logging preferences, and backend validation
- Authenticated Convex user resolution is used for dashboard ownership checks

### Dashboard Data Flow

- TanStack Query + Convex client hooks are the server-state layer for dashboard stats
- Zustand stores local interactive UI and workflow state
- The dashboard stats editor is intentionally split:
  - Convex for persisted state
  - TanStack Query for client-side server data access and cache invalidation
  - Zustand for local modal and dashboard interaction state

### ChatGPT App

- The ChatGPT App is served from the same web app
- OAuth, MCP, and Apps SDK wiring live in the existing app and backend packages
- The tool contract is documented in `docs/chatgpt-app/tool-contract.md`

## Monorepo Layout

- `apps/web`: Next.js application, dashboard UI, ChatGPT App routes, OAuth endpoints
- `packages/backend`: Convex schema, queries, mutations, shared backend server code
- `packages/ui`: shared UI components and primitives
- `docs/chatgpt-app`: ChatGPT App contracts and implementation notes
- `scripts`: verification, smoke tests, and supporting repo scripts

## Local Development

### Prerequisites

- Node.js `>=20`
- Bun `1.3.x`
- A configured Convex project
- Clerk credentials for authenticated flows

### Install

```bash
bun install
```

### Start The App

Run Convex in one terminal:

```bash
bun run convex:dev
```

Run the app in another terminal:

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

### When To Run Codegen

Run Convex codegen after schema or function signature changes:

```bash
bun run convex:codegen
```

## Environment Files

Use the example files as the source of truth for local setup:

- `apps/web/.env.local.example`
- `packages/backend/.env.local.example`

Typed env ownership is split across:

- `apps/web/env/client.ts` for browser-safe client env reads
- `packages/backend/src/server/env.ts` for Next server helpers and server routes
- `packages/backend/convex/env.ts` for Convex runtime only

## Feature Flags

Important flags already used in this repo include:

- `dashboardStatsEditor`: enables the newer flagged dashboard stats editor flow
- `checkout`: gates the billing checkout surface

Keep frontend flags and backend rollout behavior aligned when changing user-facing availability.

## Dashboard Notes

- The dashboard stats editor lives behind the existing `dashboardStatsEditor` flag boundary
- Active ranked title, season, modes, and maps come from backend configuration
- Archived or invalid sessions must not accept new match logs
- Match logging mode preference is persisted in Convex and reflected locally through Zustand

## Common Commands

```bash
bun run dev
bun run build
bun run lint
bun run typecheck
bun run test
```

Useful scoped commands:

```bash
bun run --cwd apps/web typecheck
bun run --cwd packages/backend typecheck
bun run test:app
bun run test:backend
bun run verify:chatgpt-app -- --base-url https://<domain>
```

## Billing Environment

Stripe billing requires server-side keys, a publishable key for Elements, and a server-enforced checkout flag.

Example configuration:

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_replace_me
STRIPE_SECRET_KEY=sk_test_replace_me
STRIPE_WEBHOOK_SECRET=whsec_replace_me
```

Operational notes:

- The authenticated `/checkout` page, billing API routes, and billing mutations are gated by the `checkout` flag in `apps/web/lib/flags.ts`
- Keep the Convex `featureFlags` record for `checkout` aligned with the Vercel flag rollout
- Point Stripe webhook delivery at the Convex HTTP endpoint `/stripe-webhook`

## OAuth Endpoints For The ChatGPT App

Required env vars:

- `APP_PUBLIC_ORIGIN`
- `OAUTH_JWT_SECRET`
- `OAUTH_ALLOWED_REDIRECT_URIS`
- `OAUTH_ISSUER`

Optional env vars:

- `OAUTH_AUDIENCE`
- `OAUTH_CLIENT_ID`
- `OAUTH_CLIENT_SECRET`
- `OAUTH_RESOURCE`
- `OAUTH_ALLOWED_SCOPES`
- `OAUTH_RESOURCE_DOCUMENTATION`

Routes:

- `GET /oauth/authorize`
- `POST /oauth/register`
- `POST /oauth/token`
- `POST /oauth/revoke`
- `GET /.well-known/oauth-authorization-server`
- `GET /.well-known/oauth-protected-resource`

Account settings linking:

- Set `NEXT_PUBLIC_CHATGPT_APP_CONNECT_URL` to your ChatGPT app URL so linking starts from ChatGPT
- OAuth begins when a protected tool is invoked in ChatGPT

Minimum scopes by App API endpoint:

- `GET /api/app/profile` -> `profile.read`
- `POST /api/app/disconnect` -> `profile.read`
- `GET /api/app/stats/session/current` -> `stats.read`
- `GET /api/app/stats/session/last` -> `stats.read`
- `GET /api/app/stats/matches` -> `stats.read`
- `GET /api/app/stats/matches/:id` -> `stats.read`
- `GET /api/app/stats/rank/ladder` -> `stats.read`
- `GET /api/app/stats/rank/progress` -> `stats.read`
- `GET /api/app/stats/summary` -> `stats.read`
- `GET /api/app/stats/daily` -> `stats.read`
- `GET /api/app/stats/recent` -> `stats.read`

Source of truth for route scopes and MCP `securitySchemes` mapping:

- `packages/backend/src/server/chatgpt-app-scopes.ts`

## ChatGPT App (Apps SDK)

The MCP endpoint is served at:

- `https://<your-host>/mcp`

Tools exposed by the connector:

- `codstats_open`
- `codstats_get_current_session`
- `codstats_get_last_session`
- `codstats_get_match_history`
- `codstats_get_match`
- `codstats_get_rank_ladder`
- `codstats_get_rank_progress`
- `codstats_get_settings`
- `codstats_disconnect`

### UI Template Metadata

The Apps SDK verifier expects resource metadata for:

- `ui://codstats/widget.html`
- `ui://codstats/session.html`
- `ui://codstats/matches.html`
- `ui://codstats/rank.html`
- `ui://codstats/settings.html`

`ui.domain` and `ui.csp` are derived from the configured OAuth issuer and must stay aligned with the deployed app origin.

### Public Endpoint Checks

ChatGPT App endpoints must stay publicly reachable and return JSON or MCP output, not a Clerk sign-in page.

```bash
curl -i https://<domain>/.well-known/oauth-authorization-server
curl -i https://<domain>/.well-known/oauth-protected-resource
curl -i https://<domain>/mcp
```

### Preflight Check Before ChatGPT Verification

Development diagnostics:

```bash
curl -s https://<domain>/debug/chatgpt-app-config | jq
```

Automated preflight:

```bash
bun run verify:chatgpt-app -- --base-url https://<domain>
```

### Local ChatGPT App Run

1. Start the app with `bun run dev`
2. Expose port `3000` over HTTPS
3. Enable ChatGPT developer mode
4. Create a connector with `https://<your-public-host>/mcp`
5. Prompt ChatGPT to open the CodStats dashboard

### App Tests

- `bun run test:app`
- `bun run test:app:api`
- `bun run test:app:debug`
- `bun run test:app:oauth`
- `bun run test:app:mcp`

### Smoke Test Against A Running Server

```bash
bun run test:app:smoke -- --base-url https://<your-public-host>
```

Optional authenticated mode:

```bash
CHATGPT_APP_BEARER_TOKEN=<access_token> bun run test:app:smoke -- --base-url https://<your-public-host>
```
