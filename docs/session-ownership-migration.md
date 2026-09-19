# Session ownership migration

Supporting code is implemented but has not been run. No deployment or code generation was performed during modernization.

Use `mutations/stats/dashboard:backfillSessionOwners` through the Convex dashboard or an authorized operator workflow. It is internal, cursor-based, capped at 100 sessions per invocation, and defaults to no implicit write approval: `dryRun` must be supplied; writes also require `confirmation: "backfill_session_owners"`.

1. Review and deploy the code/index changes through the normal release process.
2. Run with `dryRun: true` and `paginationOpts: { numItems: 100, cursor: null }`. Continue with each returned cursor until `isDone`.
3. Review all unresolved sessions. The migration matches exact Clerk/Discord IDs, or token identifiers prefixed by the configured Clerk issuer. Missing or ambiguous identities are never guessed.
4. After review, repeat from a null cursor with `dryRun: false` and the confirmation string. Only missing ownerUserId fields are patched; historical userId values and match data stay intact. Repeating a completed batch is safe.
5. Repeat the full dry run. Resolve any remaining missing/ambiguous records through an explicit account repair process.
6. Only once all sessions have owners, remove legacy candidate queries from `collectActiveOwnedSessions` and the legacy branch of `isLegacySessionOwnedByActor`. Retain legacy identity helpers still used by other domains until those domains have their own migration evidence.

The transitional active-session reads use owner/status and legacy-user/status indexes, with 501-row detection per identity bucket. Accounts exceeding 500 active sessions in a bucket receive an explicit error instead of incomplete access/duplicate-session decisions. This safety ceiling is not archive pagination. Existing archived sessions remain stored; the dashboard no longer reads the unused archived-summary payload during bootstrap.
