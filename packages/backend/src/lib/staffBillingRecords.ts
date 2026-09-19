import type { Doc } from "../../convex/_generated/dataModel"
import type { StaffBillingScope } from "./staffBillingScope"
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

export async function readBillingSectionRecords(
  ctx: Pick<ActionCtx, "runQuery">,
  args: {
    scope: StaffBillingScope
    cursor: string | null
    periodStart: number
    periodEnd: number
  }
) {
  const refs = internal.queries.staff.internal
  const [context, page] = await Promise.all([
    ctx.runQuery(refs.getBillingContextRecords, {
      includePayouts: args.scope === "creator-transfers",
      creatorPayoutPeriodStart: args.periodStart,
      creatorPayoutPeriodEnd: args.periodEnd,
    }),
    ctx.runQuery(refs.getBillingSectionRecords, {
      scope: args.scope,
      cursor: args.cursor,
    }),
  ])
  let creatorAccounts = page.creatorAccounts
  if (args.scope === "creator-transfers") {
    const ids = [
      ...new Set(
        context.creatorEarningLedger.map((row) => row.creatorAccountId)
      ),
    ]
    creatorAccounts = []
    for (let offset = 0; offset < ids.length; offset += 200) {
      creatorAccounts.push(
        ...(await ctx.runQuery(refs.getBillingCreatorAccountsById, {
          ids: ids.slice(offset, offset + 200),
        }))
      )
    }
  }
  const records = {
    ...context,
    ...page,
    creatorAccounts,
    creatorAttributions: [] as Doc<"creatorAttributions">[],
  }
  return records
}

export async function readCreatorReferralCounts(
  ctx: Pick<ActionCtx, "runQuery">,
  creatorAccountId: Doc<"creatorAccounts">["_id"]
) {
  let cursor: string | null = null
  let signupCount = 0
  let paidConversionCount = 0
  for (;;) {
    const page: {
      signupCount: number
      paidConversionCount: number
      isDone: boolean
      continueCursor: string
    } = await ctx.runQuery(
      internal.queries.staff.internal.getBillingCreatorReferralCountPage,
      { creatorAccountId, paginationOpts: { cursor, numItems: 50 } }
    )
    signupCount += page.signupCount
    paidConversionCount += page.paidConversionCount
    if (page.isDone) return { signupCount, paidConversionCount }
    if (cursor === page.continueCursor)
      throw new Error("Referral pagination did not advance.")
    cursor = page.continueCursor
  }
}

export async function readCatalogBillingCounts(
  ctx: Pick<ActionCtx, "runQuery">,
  plans: Doc<"billingPlans">[]
) {
  const counts = new Map(
    plans.map((plan) => [
      plan.key,
      {
        activeSubscriptionCount: 0,
        currentMonthlySubscriptionCount: 0,
        currentYearlySubscriptionCount: 0,
      },
    ])
  )
  let activeSubscriptionCount = 0
  let cursor: string | null = null
  for (;;) {
    const page: PaginationResult<Doc<"billingSubscriptions">> =
      await ctx.runQuery(
        internal.queries.staff.internal.getBillingSubscriptionsPage,
        { paginationOpts: { cursor, numItems: 200 } }
      )
    for (const subscription of page.page) {
      const active = ["active", "trialing", "past_due", "paused"].includes(
        subscription.status
      )
      if (active) activeSubscriptionCount += 1
      const count = counts.get(subscription.planKey)
      const plan = plans.find((plan) => plan.key === subscription.planKey)
      if (count && plan) {
        if (active) count.activeSubscriptionCount += 1
        if (subscription.stripePriceId === plan.monthlyPriceId)
          count.currentMonthlySubscriptionCount += 1
        if (subscription.stripePriceId === plan.yearlyPriceId)
          count.currentYearlySubscriptionCount += 1
      }
    }
    if (page.isDone) return { counts, activeSubscriptionCount }
    if (cursor === page.continueCursor)
      throw new Error("Catalog pagination did not advance.")
    cursor = page.continueCursor
  }
}
