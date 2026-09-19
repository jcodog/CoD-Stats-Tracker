# Modernization status

## Recovery checkpoint

Resumed from committed `f47b4ee` on `refactor/shadcn-baseui-rebaseline` with a clean tree. Current local changes are authoritative. No builds, codegen, dev servers, subagents, commits, pushes, deployments or external mutations are authorized.

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

## Resume at a04e8cb: staff and creator reads

Verified the clean committed checkpoint first: web/backend lint and typecheck passed; backend tests 144/144 passed. Existing TS7/ESLint, Base UI/Mira, checkout and dashboard implementations retained.

Staff directory now fetches 50 local or Clerk accounts per page, with explicit source selection, cursor navigation, page-local search and labeled page-local counts. The two sources retain visibility of orphan records on either side. Clerk rows resolve local counterparts through indexed IDs. Role changes and bans resolve only their target, independently of pagination. Removed all-user scans from those operations. Self-edit prohibition plus freshly verified admin authorization ensures an admin operator remains; the old all-directory last-admin count and page-dependent UI restriction were redundant.

Completed #28 consistency fix found during this work: backend staff action authorization also denies mismatched roles without attempting a Clerk metadata write, matching the already-updated server guard. Explicit role repair remains an authorized management action.

Creator account/setup data no longer scans referrals, subscriptions and earnings. Separate authenticated cursor pages read at most 50 rows, with owner indexes and bounded subscription existence checks. A shared aggregator deduplicates attribution/lock users and keeps currencies separate. Client totals remain marked Calculating until every reactive page has loaded, so partial earnings never appear as complete payout estimates. This still scales client work with lifetime history; a future materialized aggregate can remove that cost without changing current financial semantics.

Validation: 155 backend tests passed (598 assertions), plus 7 existing web feature tests. Added directory pagination, owner isolation, earnings-status, locked-subscription and role-mismatch cases. Web/backend lint and typecheck passed. A new frontend incomplete-estimate test still needs its final rerun after formatting.

Remaining next: staff billing/overview still contain global scans. Scope those interfaces without truncating global aggregates or financial decisions, then proceed to #33. Browser validation remains outstanding.

## Staff billing and aggregate read checkpoint

Staff overview reduces bounded user/subscription pages to complete totals. Staff ranked-session counts now page the open-session index. The connected-account backfill now processes 100 users by default, at most 200, and returns continueCursor; callers must resume with that cursor until null. No backfill was executed.

Catalog-only billing operations read the small catalog directly. Manual and scheduled payout previews read eligible ledger rows and only their creator accounts. Eligible previews detect overflow above 5,000 rows and fail explicitly instead of returning a truncated financial total. Explicit selection is limited to 500 rows. No payout or Stripe action was executed.

Remaining complete billing snapshots now read at most 200 rows/256 KB per database invocation, preserving all records across short or empty pages. This bounds each query but does NOT bound the final action response or provide one transactional snapshot across tables/pages. Staff billing section-specific response contracts remain unfinished. The season rollover mutation also still reads/archives all open sessions atomically; it needs a guarded bounded or resumable design before claiming #31 complete.

Validation: backend typecheck passed after ranked count/backfill changes. Latest backend suite passed 161 tests with 614 assertions; web feature suite passed 8 tests with 9 assertions. Web/backend lint and typecheck passed before the final ranked count change. Tests cover pagination completeness/no-progress, payout overflow, scoped selected rows, overview counts, creator ownership/conversion semantics and fail-closed role mismatch. Final ranked count regression and lint remain to rerun. Browser remains unverified because the existing localhost server was unavailable.

Next unfinished point: finish staff billing scoped responses and season rollover bounds, validate, then #33 hosted billing. Do not repeat completed TS7/Base UI/viewer/dashboard work. The later #29/#35/visual/#34 phases have not started in this checkpoint.
## Resume at f47b4ee: rollover and intentional theme shortcut

Verified the clean committed checkpoint with 163 backend regression tests, web/backend lint and web/backend typecheck. No prior tooling, Base UI, checkout, viewer or paginated data work was redone.

Season rollover now uses a persisted resumable job when more than 100 open sessions exist. Writes pause before scheduling. Each transaction archives at most 100 sessions and updates global/user counters atomically; the old title/season remain current until the final batch commits. Stale jobs and completed-job retries are ignored. Conflicting configuration changes are rejected while running. Submitting the identical target configuration resumes scheduling after an interruption. Staff UI displays running/completed progress, refreshes while running and uses the pending target when rebuilding the form. Small rollovers retain immediate completion. No rollover was executed against a deployment.

Restored the deliberate global D/d theme shortcut inside ThemeProvider. It yields to prevented events, repeat, IME composition, modifiers, editing targets, contenteditable ancestors and keyboard-driven composite widgets/overlays. The visible theme button remains and advertises aria-keyshortcuts. A forced theme is respected. This supersedes the earlier removal recorded above.

Validation: 163 backend tests passed with 636 assertions, including multi-batch completion, resume, stale job and conflicting-target checks. Ten web feature/shortcut tests passed with 19 assertions. Web/backend lint and typecheck passed. Browser check remains blocked: the existing http://localhost:3000 endpoint returned an invalid HTTP response. No server was started or debugged. Real DOM shortcut interaction and rollover display still need browser verification.

Next: #31 staff billing section-specific bounded responses remain unfinished; existing readBillingRecords still assembles complete snapshots. Creator lifetime auto-loading still needs the documented aggregate migration/end-state. Do not mark #31 complete or move to #33 until those are addressed.
## #31 section response checkpoint

Staff billing getDashboard now requires a scope and optional cursor. Catalog pages return catalog/audit data with complete subscription counts reduced from bounded pages. Subscription and customer views page 25 primary records; creator setup/access views page 25 user accounts so unconfigured users remain reachable. Only those accounts are joined through indexes. Related histories have explicit overflow errors rather than silent truncation. The UI labels page-local counts/search, provides Previous/Next, separates cache entries by scope/cursor and clears account selections on page changes. Staff identifier masking remains intact. Creator access retains staff read permission; creator program/payout scopes require admin permission.

Payout scope retains the complete, explicitly guarded period preview and limited operational run/transfer history. Ordinary catalog/account pages no longer load the payout ledger. Financial impact previews and bulk operational actions still use complete records internally; their existing preview output is bounded and is not derived from a displayed account page. They have not been converted to partial-page decisions.

Staff creator referral counts now reduce indexed pages to scalars, with indexed deduplication of historical creator/user pairs. No lifetime referral arrays return to the staff browser. This bounds response size, not total aggregate calculation time. See docs/creator-metrics-migration.md for the bounded transactional aggregate/backfill end state. The creator panel's automatic lifetime loading remains an explicit interim limitation; no partially maintained financial aggregate was introduced.

Backend regression suite passed 169 tests with 653 assertions, including scoped joins, cursor navigation, new-user creator onboarding, account overflow, referral deduplication and complete catalog totals. Web/backend final lint/typecheck and formatting for this section change remain pending. Browser verification remains blocked by the user-owned endpoint's invalid HTTP response.

## Pricing visual checkpoint

Pricing received a focused product-design pass before the broader visual phase. The public pricing decision surface now shows all active plans, including free where configured, as semantic plan cards with current-plan state, a restrained recommended paid tier, live monthly/yearly pricing, computed annual savings when the catalog actually offers one, contextual CTAs and a short feature summary. The full feature matrix remains below as supporting detail rather than carrying the whole purchase decision.

The redesign uses the existing Base UI/Mira shadcn primitives and semantic CodStats tokens. It does not hard-code catalog prices or feature entitlements. Preserve this information hierarchy when #29 removes the remaining pricing `RequestViewport`/desktop-mobile wrapper architecture; make the responsive implementation one semantic tree without reverting to the old flat billing-row presentation.

Mobbin reference search was unavailable because the connected Mobbin account requires a paid plan. The shadcn and React best-practice skills were used instead. A local TypeScript transpile syntax check reported zero diagnostics. Automated Vercel preview validation is still unavailable for these connector-created commits because the project's verified-commit rule cancels them before build, so a developer-signed follow-up commit is required before visual browser review on `dev.codstats.tech`.
