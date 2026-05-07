"use node"

import { v } from "convex/values"

import { internal } from "../../_generated/api"
import type { Id } from "../../_generated/dataModel"
import { internalAction, type ActionCtx } from "../../_generated/server"
import { getConvexEnv } from "../../../src/env"
import {
  buildCreatorPayoutPreview,
  getPreviousCompletedMonthlyPayoutPeriod,
} from "../../../src/lib/creatorTransfers"
import { executeCreatorPayoutTransfer } from "./payoutExecution"

const SYSTEM_ACTOR_CLERK_USER_ID = "system:creator-monthly-payout-cron"
const SYSTEM_ACTOR_NAME = "Creator payout schedule"

function getAutomaticTransferConfig() {
  const env = getConvexEnv()
  const enabledValue = env.CREATOR_AUTO_TRANSFERS_ENABLED?.trim().toLowerCase()

  return {
    automaticTransfersEnabled:
      enabledValue === "1" ||
      enabledValue === "true" ||
      enabledValue === "yes" ||
      enabledValue === "on",
    maxTransferAmountMinorUnits: env.CREATOR_AUTO_TRANSFER_MAX_MINOR_UNITS,
  }
}

async function insertScheduledAuditLog(args: {
  action: string
  ctx: ActionCtx
  details?: string
  entityId: string
  entityLabel?: string
  result: "error" | "success" | "warning"
  summary: string
}) {
  await args.ctx.runMutation(internal.mutations.staff.internal.insertAuditLog, {
    action: args.action,
    actorClerkUserId: SYSTEM_ACTOR_CLERK_USER_ID,
    actorName: SYSTEM_ACTOR_NAME,
    actorRole: "admin",
    details: args.details,
    entityId: args.entityId,
    entityLabel: args.entityLabel,
    entityType: "billingCreatorTransferRun",
    result: args.result,
    summary: args.summary,
  })
}

export const runScheduledMonthlyCreatorPayoutTransfers = internalAction({
  args: {
    dryRun: v.optional(v.boolean()),
    now: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<unknown> => {
    const now = args.now ?? Date.now()
    const period = getPreviousCompletedMonthlyPayoutPeriod(now)
    const config = getAutomaticTransferConfig()
    const existingRun: { _id: Id<"creatorPayoutRuns"> } | null =
      await ctx.runQuery(
      internal.queries.staff.internal.findCreatorPayoutRunByPeriodStartAndSource,
      {
        periodStart: period.periodStart,
        source: "scheduled",
      }
    )

    if (existingRun && !args.dryRun) {
      return {
        automaticTransfersEnabled: config.automaticTransfersEnabled,
        dryRun: false,
        existingRunId: existingRun._id,
        period,
        summary: "Scheduled creator payout run already exists for this period.",
      }
    }

    const records = await ctx.runQuery(
      internal.queries.staff.internal.getBillingRecords,
      {
        creatorPayoutPeriodEnd: period.periodEnd,
        creatorPayoutPeriodStart: period.periodStart,
      }
    )
    const preview = buildCreatorPayoutPreview({
      creatorAccounts: records.creatorAccounts,
      ledgerRows: records.creatorEarningLedger,
      now,
      periodEnd: period.periodEnd,
      periodStart: period.periodStart,
    })

    if (args.dryRun) {
      return {
        automaticTransfersEnabled: config.automaticTransfersEnabled,
        dryRun: true,
        period,
        preview,
        summary: `Dry run found ${preview.transferCount} ready transfer group(s) and ${preview.blockedGroups.length} blocked group(s).`,
      }
    }

    const run: {
      creatorCount: number
      currencyTotals: Array<{ amount: number; currency: string }>
      payoutRunId: Id<"creatorPayoutRuns">
      transferCount: number
      transferIds: Array<Id<"creatorPayoutTransfers">>
    } = await ctx.runMutation(
      internal.mutations.staff.payouts.createCreatorPayoutRun,
      {
        allowEmpty: true,
        blockedGroupCount: preview.blockedGroups.length,
        createdByClerkUserId: SYSTEM_ACTOR_CLERK_USER_ID,
        createdByName: SYSTEM_ACTOR_NAME,
        createdBySystem: true,
        ledgerEntryIds:
          preview.selectedLedgerEntryIds as Array<Id<"creatorEarningLedger">>,
        periodEnd: period.periodEnd,
        periodStart: period.periodStart,
        skippedLedgerRowCount: preview.excludedCount,
        source: "scheduled",
      }
    )

    await insertScheduledAuditLog({
      action: "billing.creator_transfers.scheduled_run_created",
      ctx,
      details: JSON.stringify(
        {
          automaticTransfersEnabled: config.automaticTransfersEnabled,
          blockedGroups: preview.blockedGroups,
          currencyTotals: preview.currencyTotals,
          dryRun: false,
          period,
          readyTransferCount: preview.transferCount,
          skippedLedgerRowCount: preview.excludedCount,
        },
        null,
        2
      ),
      entityId: run.payoutRunId,
      entityLabel: `Creator transfer run ${run.payoutRunId}`,
      result:
        preview.blockedGroups.length > 0 || !config.automaticTransfersEnabled
          ? "warning"
          : "success",
      summary: config.automaticTransfersEnabled
        ? `Created scheduled creator transfer run with ${run.transferCount} transfer(s).`
        : `Created scheduled creator transfer review run with automatic transfers disabled.`,
    })

    if (preview.blockedGroups.length > 0) {
      await insertScheduledAuditLog({
        action: "billing.creator_transfers.scheduled_blockers_recorded",
        ctx,
        details: JSON.stringify(
          {
            blockedGroups: preview.blockedGroups,
            period,
          },
          null,
          2
        ),
        entityId: run.payoutRunId,
        entityLabel: `Creator transfer run ${run.payoutRunId}`,
        result: "warning",
        summary: `${preview.blockedGroups.length} creator transfer group(s) require staff review.`,
      })
    }

    if (!config.automaticTransfersEnabled || run.transferIds.length === 0) {
      return {
        automaticTransfersEnabled: config.automaticTransfersEnabled,
        dryRun: false,
        period,
        preview,
        run,
        summary: config.automaticTransfersEnabled
          ? "Scheduled creator payout run created with no executable transfers."
          : "Scheduled creator payout review run created; automatic transfers are disabled.",
      }
    }

    const transfers = await ctx.runQuery(
      internal.queries.staff.internal.listCreatorPayoutTransfersByRunId,
      {
        payoutRunId: run.payoutRunId,
      }
    )
    let transferredCount = 0
    let reviewCount = 0
    let failedCount = 0

    for (const transfer of transfers) {
      if (transfer.status !== "draft" && transfer.status !== "transferring") {
        continue
      }

      const result = await executeCreatorPayoutTransfer({
        allowedStatuses: ["draft", "transferring"],
        ctx,
        maxTransferAmountMinorUnits: config.maxTransferAmountMinorUnits,
        source: "scheduled",
        transfer: {
          ...transfer,
          status: transfer.status,
        },
      })

      if (result === "transferred") {
        transferredCount += 1
      } else if (result === "requires_review") {
        reviewCount += 1
      } else {
        failedCount += 1
      }
    }

    await insertScheduledAuditLog({
      action: "billing.creator_transfers.scheduled_run_executed",
      ctx,
      details: JSON.stringify(
        {
          failedCount,
          period,
          payoutRunId: run.payoutRunId,
          reviewCount,
          transferredCount,
        },
        null,
        2
      ),
      entityId: run.payoutRunId,
      entityLabel: `Creator transfer run ${run.payoutRunId}`,
      result: failedCount > 0 || reviewCount > 0 ? "warning" : "success",
      summary: `Scheduled creator transfer run: ${transferredCount} transferred to Stripe Connect, ${reviewCount} review, ${failedCount} failed.`,
    })

    return {
      automaticTransfersEnabled: config.automaticTransfersEnabled,
      dryRun: false,
      failedCount,
      period,
      preview,
      reviewCount,
      run,
      summary: `Scheduled creator transfer run: ${transferredCount} transferred to Stripe Connect, ${reviewCount} review, ${failedCount} failed.`,
      transferredCount,
    }
  },
})
