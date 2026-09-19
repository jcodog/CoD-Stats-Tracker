# Creator metrics aggregate migration

The current creator panel is an interim implementation. Each reactive query reads at most 50 rows, and financial totals stay hidden until all three streams finish. It still auto-loads lifetime attribution, usage-lock and earnings history into the browser. That is not a scalable end state. The staff creator directory now reduces indexed referral pages to scalar counts on the server, but its calculation time also grows with referral history.

A materialized aggregate is appropriate. Implementing only the read cache would be unsafe: attribution changes, subscription reconciliation, ledger eligibility and payout transitions all change these totals. The write coverage and historical reconciliation must land together. This checkpoint does not add a partially maintained financial cache.

## Target contract

The creator dashboard should return account/setup state, referral counts, estimated earnings by currency and an explicit aggregate state: rebuilding, ready or failed. Ready means a completed generation plus all subsequent transactional updates. A timestamp alone does not prove completeness. Rebuilding and failed states must not display a partial amount as a total. Currency amounts remain separate integer minor-unit totals.

Persist one contribution per creator/referred-user pair. It records whether attribution or a usage lock exists and whether the canonical bound subscription qualifies as paid. Updating either source recomputes that contribution and applies only the difference to the creator counters. This preserves deduplication when attribution and usage locks overlap. Staff historical attribution-only counts are a separate definition and must not silently replace the creator panel's definition.

Persist one earnings contribution per ledger entry, including its creator, currency, amount and current estimate eligibility. Ledger inserts, corrections, status changes and payout transitions update the contribution and currency aggregate in the same transaction. Repeated webhook delivery or payout retries produce a zero delta after the first application. Aggregate data must never be used as authorization for a transfer; execution retains canonical ledger validation and frozen transfer-run entries.

## Bounded cutover

1. Add contribution/aggregate schemas and cover every writer in creator attribution lifecycle, subscription reconciliation, creator accounting and payout mutations. Use shared transaction helpers instead of asynchronous best-effort increments.
2. Enable transactional contribution updates first. Keep dashboard reads on the current implementation while the new generation is rebuilding.
3. Backfill canonical users and ledger entries in cursor batches of at most 100 rows. Re-read each canonical record inside its transaction and upsert its contribution. Never sum a stale exported snapshot. Store separate cursors for every source, a generation identifier, progress and errors. Retrying a batch must not double-count it.
4. Reconcile every creator with independent cursor-batched calculations. Deduplicate via indexed creator/user contribution records, not an unbounded in-memory set. Verify canceled subscriptions, bound usage locks, currency changes, reversed earnings and payout transitions. A mismatch keeps that creator unready.
5. Mark a generation ready only after all source cursors finish and reconciliation succeeds. Switch the dashboard to a bounded aggregate query; remove automatic lifetime history loading. Keep any detailed ledger/history browsing separately paginated and user-driven.
6. Retain the previous read path during a monitored rollout, then remove it once ready aggregates match. Do not fall back to silently showing a partially loaded total.

No schema migration, backfill, deployment or external write has been run. The current lifetime auto-loading cost remains documented until this complete migration can be implemented and validated.
