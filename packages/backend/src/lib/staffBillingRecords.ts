import type {
  FunctionArgs,
  PaginationOptions,
  PaginationResult,
} from "convex/server"
import type { ActionCtx } from "../../convex/_generated/server"
import { internal } from "../../convex/_generated/api"

// Complete operational snapshots must not silently truncate financial decisions.
// Fetch bounded database pages, retaining the existing action result contract.
export async function readAllPages<T>(
  read: (options: PaginationOptions) => Promise<PaginationResult<T>>
): Promise<T[]> {
  const rows: T[] = []
  let cursor: string | null = null
  for (;;) {
    const result = await read({ cursor, numItems: 200 })
    rows.push(...result.page)
    if (result.isDone) return rows
    if (result.continueCursor === cursor)
      throw new Error("Billing pagination did not advance.")
    cursor = result.continueCursor
  }
}

export async function readBillingRecords(
  ctx: Pick<ActionCtx, "runQuery">,
  args: FunctionArgs<
    typeof internal.queries.staff.internal.getBillingContextRecords
  >
) {
  const refs = internal.queries.staff.internal
  const [
    context,
    subscriptions,
    customers,
    accessGrants,
    users,
    creatorAccounts,
    creatorAttributions,
  ] = await Promise.all([
    ctx.runQuery(refs.getBillingContextRecords, args),
    readAllPages((paginationOpts) =>
      ctx.runQuery(refs.getBillingSubscriptionsPage, { paginationOpts })
    ),
    readAllPages((paginationOpts) =>
      ctx.runQuery(refs.getBillingCustomersPage, { paginationOpts })
    ),
    readAllPages((paginationOpts) =>
      ctx.runQuery(refs.getBillingAccessGrantsPage, { paginationOpts })
    ),
    readAllPages((paginationOpts) =>
      ctx.runQuery(refs.getBillingUsersPage, { paginationOpts })
    ),
    readAllPages((paginationOpts) =>
      ctx.runQuery(refs.getBillingCreatorAccountsPage, { paginationOpts })
    ),
    readAllPages((paginationOpts) =>
      ctx.runQuery(refs.getBillingCreatorAttributionsPage, { paginationOpts })
    ),
  ])
  return {
    ...context,
    subscriptions: subscriptions.sort((a, b) => b.updatedAt - a.updatedAt),
    customers,
    accessGrants,
    users: users.sort((a, b) => a.name.localeCompare(b.name)),
    creatorAccounts,
    creatorAttributions,
  }
}
