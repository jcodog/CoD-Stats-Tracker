# Modernization status

## Recovery checkpoint

Resumed from committed `a9007a7` on `refactor/shadcn-baseui-rebaseline` with a clean tree. Current local changes are authoritative. No builds, codegen, dev servers, subagents, commits, pushes, deployments or external mutations are authorized.

## Completed source work

- Tooling: TypeScript 7.0.2 compiler via `@typescript/native`; TypeScript 6.0.3 JavaScript API for typescript-eslint 8.70.0. Explicit compiler paths avoid competing tsc binaries. The typescript6 wrapper alias failed under Bun, so retain the real TS6 package. Web/UI lint and typecheck passed in the previous run. Backend lint/typecheck now pass after removing unused code and deriving the Redis client type from its factory. No rule suppression.
- Base UI/Mira: regenerated 22 used primitives, migrated render composition and toggle/select contracts, fixed shared cn/mobile-hook boundaries, removed 27 unreachable components and obsolete direct dependencies. Bare d theme hotkey removed. Web/UI lint and typecheck passed. Browser interaction verification remains pending, so do not claim the UI workstream fully validated.
- #36 checkout policy: removed the lossy Vercel-to-Convex mirror and cron. UI availability and backend checkout/quote enforcement use one explicit Convex environment policy. Only literal true enables checkout. UI query failures deny availability. Vercel targeting remains for overlays; checkout is an operational switch and has no targeting exceptions. Legacy featureFlags table remains dormant to avoid destructive migration.

## #36 verification

Fixed the Node action directive displaced by an import. Added registered query/action tests proving missing, false, invalid and empty configuration fail closed before authentication or Stripe work; enabled requests still require authentication; an allowlisted identity cannot bypass disabled policy or consult the old mirror.

- Backend test:convex: 130 passed, 0 failed, 513 assertions across 22 files.
- Backend lint and typecheck: passed after cleanup.
- Tests required an escalated retry because the filesystem sandbox could not resolve installed dependency junctions. No installation changes were needed.
- Deployment configuration is intentionally untouched. To enable checkout later, set BILLING_CHECKOUT_ENABLED=true in the target Convex deployment. Set false to disable; there is no six-hour synchronization job. Local example defaults to false.

## Remaining order

1. #28 request-scoped viewer/access resolution and authenticated shell bootstrap. In progress next.
2. #27/#30/#31 dashboard query consolidation, native subscriptions, bounded reads and legacy migration end state.
3. #33 audit existing hosted Stripe billing, FX, creator attribution, Connect and payouts; preserve working behavior.
4. #29 responsive composition without server user-agent branching.
5. #35 provider scope and public hydration.
6. Public redesign with one React Bits background; shared Cleo-family auth shell with Dither; protected application UX.
7. #34 final regression/performance validation using permitted existing scripts and Playwright CLI.

## Browser blocker

The user-owned localhost:3000 server returned ERR_EMPTY_RESPONSE. Chrome channel is available; Playwright's bundled browser is not. Auth storage exists at playwright/.auth/user.json. A request to check/restart the existing server is pending. Never start a server or automate login. Browser evidence is still outstanding.

## Research retained

[Microsoft side-by-side TS7/TS6 guidance](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0), [typescript-eslint support](https://typescript-eslint.io/users/dependency-versions/), [Base UI button composition](https://ui.shadcn.com/docs/components/base/button), [Convex environment variables](https://docs.convex.dev/production/environment-variables).

## #28 implementation checkpoint

Added a request-scoped viewer session (one Convex-template token) and viewer snapshot shared by flags, creator access, app navigation and staff guards. A compact Convex query resolves the user once plus billing access; removed the unused creator-account lookup. Dashboard bootstrap and attribution share token resolution. Staff guards no longer write Clerk metadata during reads; mismatches fail closed and require the existing explicit repair flow. Staff navigation requires matching roles. Server-verified application/staff shells sit outside the Convex loading gate, while protected data content retains its authentication guard.

Backend suite: 135 passed, 0 failed, 544 assertions, including anonymous/missing-user isolation, one user read, legacy creator fallback and staff workspace access. Backend and web lint/typecheck passed for the snapshot changes. Final shell-placement checks and browser verification remain pending. A subsequent web typecheck found and fixed #36's Vercel discovery boundary: only presentationFlags are now published.

## #27/#30 dashboard checkpoint

Dashboard state now includes map/mode references. One selected-session analytics query computes SR timeline, daily statistics and outcome history from one games read. Removed unused individual chart/catalog endpoints after checking callers. Counter-only overview reads no games. Recent-match endpoint honors a clamped limit via descending indexes, including an added loss-protection index. The dashboard shows latest 50 matches while time-filtered chart statistics use the complete outcome history.

Replaced TanStack dashboard reads with authenticated native Convex subscriptions. TanStack remains only for mutation pending/error state here, with no separate domain cache or manual invalidation. Logging mode uses the existing local selection while awaiting live state. Reduced the client adapter by roughly 400 lines.

Backend regression suite: 140 passed, 0 failed, 558 assertions. Added registered-query tests for one history read, counter-only overview, SR chronology, loss-protection semantics, recent limits and foreign-session rejection. Web/backend typecheck passed; lint passed. Browser live mutation updates remain unverified.

#31 is NOT complete: combined analytics still reads full history and dashboard session discovery still scans owner/legacy buckets. Next step is bounded/paginated history with explicit completeness in the UI, then session/archive and remaining staff/creator reads. Do not silently cap all-time statistics.

## #31 current checkpoint (supersedes full-history analytics above)

Replaced the temporary combined full-history query with a bounded, native paginated history query (200 rows/512 KB per query), a counter-only overview and an indexed latest-50 query. Shared pure projections compute all charts from loaded ascending history. The UI explicitly marks incomplete chart history and offers Load more; totals/recent matches stay current. This deliberately separates counter and history lifetimes instead of rereading all games to package them together.

Active session discovery now uses owner/status and legacy-user/status indexes, excludes archived history at the database, and detects overflow above 500 rows per identity bucket rather than silently truncating authorization or duplicate-session decisions. Removed the unused archive/history fields from dashboard bootstrap after checking consumers. Archived rows are not deleted. Identity-only session reads no longer resolve billing or look up the same user twice.

Added internal cursor-batched backfillSessionOwners with dry run, explicit write confirmation, ambiguity handling and idempotency. Not executed. See docs/session-ownership-migration.md for the cutover that removes transitional legacy reads after verification.

Remaining #31: staff-wide user/billing scans and creator aggregate scans still need scoped/paginated interfaces. Staff actions legitimately use external Clerk/Stripe state, so their TanStack action caches are not automatically redundant. Do not replace financial aggregates with truncated totals.

Latest browser retry: localhost:3000 returned ERR_CONNECTION_REFUSED. No browser validation completed.
