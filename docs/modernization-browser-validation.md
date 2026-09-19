# Modernization browser acceptance

Status: blocked on 2026-09-19. A single HTTP check to http://localhost:3000 returned connection refused. Do not start or debug the user-owned server. Source changes are validated separately; no browser, Lighthouse or bundle-size improvement is claimed.

## Source checks

- `bun run --cwd apps/web lint`
- `bun run --cwd apps/web typecheck`
- `bun run --cwd apps/web test` (includes provider/import-boundary guards)
- `bun run --cwd packages/backend test:convex` for preserved session/billing contracts

## Capture matrix once localhost is available

Use only Playwright CLI, one command at a time. Do not write automation scripts. Save artifacts under `.artifacts/screenshots`. Use Chrome channel because the bundled browser was unavailable at the previous checkpoint. Examples:

```powershell
bunx playwright screenshot --channel=chrome --viewport-size="390,844" --full-page http://localhost:3000 .artifacts/screenshots/landing-phone.png
bunx playwright screenshot --channel=chrome --viewport-size="1440,1000" --full-page http://localhost:3000/pricing .artifacts/screenshots/pricing-desktop.png
bunx playwright screenshot --channel=chrome --load-storage=playwright/.auth/user.json --viewport-size="768,1024" --full-page http://localhost:3000/dashboard .artifacts/screenshots/dashboard-tablet.png
```

Cover 390, 768 and 1440px widths in both themes. Inspect landing, pricing, a policy, sign-in/sign-up, dashboard, account, billing, creator home/queue and staff directory/billing. Protected commands always require the saved storage state. If a protected route redirects to sign-in, stop that flow and ask the user to refresh authentication using `bunx tsx scripts/playwright/save-auth.ts`; do not automate login or debug application auth first.

## Interaction acceptance (#29/#32)

- Resize without navigation: one tree responds without hydration warnings, clipped controls or document-level horizontal overflow. Pricing and match tables scroll within their labeled regions, including keyboard scrolling.
- D/d toggles theme alongside the visible control. It does not act in editable fields, selects, comboboxes, command menus, dialogs, during composition, after prevented events, or with Ctrl/Alt/Meta. Check theme stability across public, Clerk and app routes.
- Clerk sign-in/up including validation and secondary steps remain legible in both themes. Creator-code notices remain visible. Verify mobile keyboard and zoom do not obscure the form.
- Dialog/sheet focus entry, trap, Escape, return focus, select/combobox keyboard navigation and popover behavior use the existing Base UI implementation correctly. Session creation progress and match logging steps remain reachable on small screens. Do not submit writes to external services under the current authorization.
- Verify empty/loading/error displays, selected session context, complete versus partially loaded history labels, recent-match notes, financial completeness indicators and staff page-local search counts. Exercise navigation and filters without executing billing, Connect, payout or staff mutations.
- Check heading order, control names, focus visibility, contrast, reduced motion, 200% zoom and screen-reader sort announcements. Screenshots alone do not establish these checks.

## Performance/regression acceptance (#34)

Use browser DevTools/manual profiling when the existing server permits; no builds. Compare equivalent routes/data/device settings and record environment, cold/warm navigation and trace artifacts. Development-server timings are diagnostic, not production performance claims.

- Network: public/static navigation must not open Convex subscriptions or load TanStack application client infrastructure. Protected routes initialize those clients once per mounted application boundary. Check direct entry and cross-group navigation.
- Auth/reconnect: inspect loading-to-authenticated transitions, sign-out and reconnect without stale protected content or duplicate live subscriptions.
- Graphics: Threads only on landing, Dither only on auth. Verify actual shader compilation and visible semantic color in both themes. Check static fallback below 768px, reduced motion, disabled WebGL and context loss. Hidden/off-screen effects must stop rendering and unmount must release listeners/GPU resources. No graphics module should enter protected route chunks.
- Suggested production acceptance targets for a later authorized production-like measurement: LCP <=2.5s, INP <=200ms and CLS <=0.1. Capture actual measurements before declaring these met. Check no sustained long tasks during idle effects, filter changes or match-table interaction.

No issue should be marked fully browser/performance validated based solely on source tests. Record each executed check and concrete failures in modernization-status.md; fix those failures without reopening completed backend workstreams.
