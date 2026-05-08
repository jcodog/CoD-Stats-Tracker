import { v } from "convex/values"

import type { Doc, Id } from "../../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../../_generated/server"
import {
  buildCreatorPayoutPreview,
  buildCreatorPayoutTransferIdempotencyKey,
} from "../../../src/lib/creator/payouts/transfers"

const payoutTransferStatusValidator = v.union(
  v.literal("cancelled"),
  v.literal("draft"),
  v.literal("failed"),
  v.literal("requires_review"),
  v.literal("transferred"),
  v.literal("transferring")
)

const payoutRunSourceValidator = v.union(
  v.literal("dry_run_review"),
  v.literal("manual"),
  v.literal("scheduled")
)

const payoutTransferSourceValidator = v.union(
  v.literal("dry_run_review"),
  v.literal("manual_retry"),
  v.literal("scheduled")
)

async function getPayoutTransfersByRunId(
  ctx: MutationCtx,
  payoutRunId: Id<"creatorPayoutRuns">
) {
  return await ctx.db
    .query("creatorPayoutTransfers")
    .withIndex("by_payoutRunId", (query) => query.eq("payoutRunId", payoutRunId))
    .collect()
}

function getRunStatusFromTransfers(
  transfers: Array<Doc<"creatorPayoutTransfers">>
) {
  if (transfers.length === 0) {
    return "completed" as const
  }

  if (transfers.every((transfer) => transfer.status === "transferred")) {
    return "completed" as const
  }

  const failedCount = transfers.filter(
    (transfer) =>
      transfer.status === "failed" || transfer.status === "requires_review"
  ).length
  const transferredCount = transfers.filter(
    (transfer) => transfer.status === "transferred"
  ).length

  if (failedCount > 0 && transferredCount > 0) {
    return "partial_failed" as const
  }

  if (failedCount > 0) {
    return "requires_review" as const
  }

  if (transfers.some((transfer) => transfer.status === "transferring")) {
    return "processing" as const
  }

  return "draft" as const
}

async function refreshPayoutRunStatus(
  ctx: MutationCtx,
  payoutRunId: Id<"creatorPayoutRuns">
) {
  const run = await ctx.db.get(payoutRunId)

  if (!run || run.status === "cancelled" || run.status === "canceled") {
    return run
  }

  const transfers = await getPayoutTransfersByRunId(ctx, payoutRunId)
  const failedTransfers = transfers.filter(
    (transfer) =>
      transfer.status === "failed" || transfer.status === "requires_review"
  )
  const nextStatus = getRunStatusFromTransfers(transfers)

  await ctx.db.patch(payoutRunId, {
    failureSummary:
      failedTransfers.length > 0
        ? `${failedTransfers.length} transfer(s) require staff review or retry.`
        : undefined,
    status: nextStatus,
    updatedAt: Date.now(),
  })

  return await ctx.db.get(payoutRunId)
}

async function getRowsForTransfer(
  ctx: MutationCtx,
  transfer: Doc<"creatorPayoutTransfers">
) {
  return (
    await Promise.all(transfer.ledgerEntryIds.map((rowId) => ctx.db.get(rowId)))
  ).filter((row): row is Doc<"creatorEarningLedger"> => Boolean(row))
}

export const createCreatorPayoutRun = internalMutation({
  args: {
    allowEmpty: v.optional(v.boolean()),
    blockedGroupCount: v.optional(v.number()),
    createdByClerkUserId: v.string(),
    createdByName: v.optional(v.string()),
    createdBySystem: v.optional(v.boolean()),
    ledgerEntryIds: v.optional(v.array(v.id("creatorEarningLedger"))),
    now: v.optional(v.number()),
    periodEnd: v.optional(v.number()),
    periodStart: v.optional(v.number()),
    skippedLedgerRowCount: v.optional(v.number()),
    source: v.optional(payoutRunSourceValidator),
  },
  handler: async (ctx, args) => {
    const now = args.now ?? Date.now()
    let selectedRows: Array<Doc<"creatorEarningLedger">>

    if (args.ledgerEntryIds) {
      selectedRows = (
        await Promise.all(
          args.ledgerEntryIds.map((ledgerEntryId) => ctx.db.get(ledgerEntryId))
        )
      ).filter((row): row is Doc<"creatorEarningLedger"> => Boolean(row))
    } else if (args.periodStart !== undefined && args.periodEnd !== undefined) {
      const periodStart = args.periodStart
      const periodEnd = args.periodEnd

      selectedRows = await ctx.db
        .query("creatorEarningLedger")
        .withIndex("by_status_invoiceIssuedAt", (query) =>
          query
            .eq("status", "eligible")
            .gte("invoiceIssuedAt", periodStart)
            .lte("invoiceIssuedAt", periodEnd)
        )
        .take(5000)
    } else {
      selectedRows = await ctx.db
        .query("creatorEarningLedger")
        .withIndex("by_status", (query) => query.eq("status", "eligible"))
        .take(5000)
    }
    const creatorAccountIds = Array.from(
      new Set(selectedRows.map((row) => row.creatorAccountId))
    )
    const creatorAccounts = (
      await Promise.all(
        creatorAccountIds.map((creatorAccountId) => ctx.db.get(creatorAccountId))
      )
    ).filter((account): account is Doc<"creatorAccounts"> => Boolean(account))
    const preview = buildCreatorPayoutPreview({
      creatorAccounts,
      ledgerRows: selectedRows,
      now,
      periodEnd: args.periodEnd,
      periodStart: args.periodStart,
      selectedLedgerEntryIds: args.ledgerEntryIds,
    })

    if (preview.readyGroups.length === 0 && !args.allowEmpty) {
      throw new Error("No eligible creator earnings are ready to transfer.")
    }

    for (const ledgerEntryId of preview.selectedLedgerEntryIds) {
      const row = await ctx.db.get(ledgerEntryId as Id<"creatorEarningLedger">)

      if (
        !row ||
        row.status !== "eligible" ||
        row.payoutRunId ||
        row.payoutTransferId ||
        row.stripeTransferId ||
        row.transferredAt ||
        row.transferStatus
      ) {
        throw new Error(
          "One or more creator earning rows are no longer eligible for this transfer run."
        )
      }
    }

    const payoutRunId = await ctx.db.insert("creatorPayoutRuns", {
      blockedGroupCount: args.blockedGroupCount,
      createdAt: now,
      createdByClerkUserId: args.createdByClerkUserId,
      createdByName: args.createdByName,
      createdBySystem: args.createdBySystem,
      creatorCount: preview.readyCreatorCount,
      currencyTotals: preview.currencyTotals,
      failureSummary:
        (args.blockedGroupCount ?? 0) > 0
          ? `${args.blockedGroupCount} creator transfer group(s) require staff review.`
          : undefined,
      periodEnd: args.periodEnd,
      periodStart: args.periodStart,
      skippedLedgerRowCount: args.skippedLedgerRowCount,
      source: args.source,
      status:
        preview.readyGroups.length > 0
          ? "draft"
          : (args.blockedGroupCount ?? 0) > 0
            ? "requires_review"
            : "completed",
      transferCount: preview.transferCount,
      updatedAt: now,
    })
    const transferIds: Array<Id<"creatorPayoutTransfers">> = []

    for (const group of preview.readyGroups) {
      if (!group.stripeConnectedAccountId) {
        throw new Error("Ready creator transfer group is missing Stripe account.")
      }

      const payoutTransferId = await ctx.db.insert("creatorPayoutTransfers", {
        amount: group.amount,
        createdAt: now,
        creatorAccountId: group.creatorAccountId as Id<"creatorAccounts">,
        creatorCode: group.creatorCode,
        currency: group.currency,
        failureCode: undefined,
        failureMessage: undefined,
        idempotencyKey: "pending",
        ledgerEntryIds:
          group.ledgerEntryIds as Array<Id<"creatorEarningLedger">>,
        payoutRunId,
        source: args.source === "scheduled" ? "scheduled" : "dry_run_review",
        status: "draft",
        stripeConnectedAccountId: group.stripeConnectedAccountId,
        stripeTransferId: undefined,
        transferredAt: undefined,
        updatedAt: now,
      })
      const idempotencyKey = buildCreatorPayoutTransferIdempotencyKey({
        payoutTransferId,
      })

      await ctx.db.patch(payoutTransferId, {
        idempotencyKey,
        updatedAt: now,
      })
      transferIds.push(payoutTransferId)

      for (const ledgerEntryId of group.ledgerEntryIds) {
        await ctx.db.patch(ledgerEntryId as Id<"creatorEarningLedger">, {
          payoutRunId,
          payoutTransferId,
          status: "reserved",
          transferStatus: "draft",
          updatedAt: now,
        })
      }
    }

    return {
      creatorCount: preview.readyCreatorCount,
      currencyTotals: preview.currencyTotals,
      payoutRunId,
      transferCount: transferIds.length,
      transferIds,
    }
  },
})

export const markCreatorPayoutTransferExecuting = internalMutation({
  args: {
    allowedStatuses: v.array(payoutTransferStatusValidator),
    source: v.optional(payoutTransferSourceValidator),
    payoutTransferId: v.id("creatorPayoutTransfers"),
  },
  handler: async (ctx, args) => {
    const transfer = await ctx.db.get(args.payoutTransferId)

    if (!transfer) {
      throw new Error("Creator payout transfer not found.")
    }

    if (
      transfer.status === "transferred" ||
      transfer.stripeTransferId ||
      transfer.transferredAt
    ) {
      throw new Error("This creator transfer has already succeeded.")
    }

    if (!args.allowedStatuses.includes(transfer.status)) {
      throw new Error("This creator transfer is not in a retryable state.")
    }

    const run = await ctx.db.get(transfer.payoutRunId)

    if (!run || run.status === "cancelled" || run.status === "canceled") {
      throw new Error("Creator payout run is not executable.")
    }

    const rows = await getRowsForTransfer(ctx, transfer)

    if (rows.length !== transfer.ledgerEntryIds.length) {
      throw new Error("Creator transfer ledger rows are incomplete.")
    }

    const expectedLedgerStatuses =
      transfer.status === "draft" || transfer.status === "transferring"
        ? new Set(["reserved"])
        : new Set(["transfer_failed", "transfer_requires_review"])

    for (const row of rows) {
      if (
        row.payoutTransferId !== transfer._id ||
        !expectedLedgerStatuses.has(row.status)
      ) {
        throw new Error(
          "Creator transfer ledger rows require review before retry."
        )
      }
    }

    const now = Date.now()

    await ctx.db.patch(transfer._id, {
      failureCode: undefined,
      failureMessage: undefined,
      source: args.source ?? transfer.source,
      status: "transferring",
      updatedAt: now,
    })

    for (const row of rows) {
      await ctx.db.patch(row._id, {
        status: "reserved",
        transferStatus: "transferring",
        updatedAt: now,
      })
    }

    await ctx.db.patch(transfer.payoutRunId, {
      executedAt: run.executedAt ?? now,
      status: "processing",
      updatedAt: now,
    })

    return await ctx.db.get(transfer._id)
  },
})

export const markCreatorPayoutTransferSucceeded = internalMutation({
  args: {
    payoutTransferId: v.id("creatorPayoutTransfers"),
    stripeTransferId: v.string(),
    transferredAt: v.number(),
  },
  handler: async (ctx, args) => {
    const transfer = await ctx.db.get(args.payoutTransferId)

    if (!transfer) {
      throw new Error("Creator payout transfer not found.")
    }

    if (
      transfer.stripeTransferId &&
      transfer.stripeTransferId !== args.stripeTransferId
    ) {
      throw new Error("Creator transfer already has a different Stripe ID.")
    }

    await ctx.db.patch(transfer._id, {
      failureCode: undefined,
      failureMessage: undefined,
      status: "transferred",
      stripeTransferId: args.stripeTransferId,
      transferredAt: args.transferredAt,
      updatedAt: args.transferredAt,
    })

    for (const row of await getRowsForTransfer(ctx, transfer)) {
      if (row.payoutTransferId !== transfer._id) {
        throw new Error("Creator ledger row transfer lock mismatch.")
      }

      await ctx.db.patch(row._id, {
        status: "transferred",
        stripeTransferId: args.stripeTransferId,
        transferredAt: args.transferredAt,
        transferStatus: "transferred",
        updatedAt: args.transferredAt,
      })
    }

    return await refreshPayoutRunStatus(ctx, transfer.payoutRunId)
  },
})

export const markCreatorPayoutTransferFailed = internalMutation({
  args: {
    failureCode: v.optional(v.string()),
    failureMessage: v.string(),
    payoutTransferId: v.id("creatorPayoutTransfers"),
    status: v.union(v.literal("failed"), v.literal("requires_review")),
  },
  handler: async (ctx, args) => {
    const transfer = await ctx.db.get(args.payoutTransferId)

    if (!transfer) {
      throw new Error("Creator payout transfer not found.")
    }

    if (transfer.stripeTransferId || transfer.status === "transferred") {
      throw new Error("A successful creator transfer cannot be marked failed.")
    }

    const now = Date.now()
    const ledgerStatus =
      args.status === "requires_review"
        ? "transfer_requires_review"
        : "transfer_failed"

    await ctx.db.patch(transfer._id, {
      failureCode: args.failureCode,
      failureMessage: args.failureMessage,
      status: args.status,
      updatedAt: now,
    })

    for (const row of await getRowsForTransfer(ctx, transfer)) {
      if (row.payoutTransferId !== transfer._id) {
        throw new Error("Creator ledger row transfer lock mismatch.")
      }

      await ctx.db.patch(row._id, {
        status: ledgerStatus,
        transferStatus: args.status,
        updatedAt: now,
      })
    }

    return await refreshPayoutRunStatus(ctx, transfer.payoutRunId)
  },
})

export const cancelCreatorPayoutRun = internalMutation({
  args: {
    payoutRunId: v.id("creatorPayoutRuns"),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.payoutRunId)

    if (!run) {
      throw new Error("Creator payout run not found.")
    }

    if (run.status !== "draft" || run.executedAt !== undefined) {
      throw new Error("Only draft creator payout runs can be cancelled.")
    }

    const now = Date.now()
    const transfers = await getPayoutTransfersByRunId(ctx, run._id)

    for (const transfer of transfers) {
      if (transfer.stripeTransferId || transfer.status === "transferred") {
        throw new Error("Cannot cancel a run with successful Stripe transfers.")
      }
    }

    for (const transfer of transfers) {
      await ctx.db.patch(transfer._id, {
        status: "cancelled",
        updatedAt: now,
      })

      for (const row of await getRowsForTransfer(ctx, transfer)) {
        if (row.stripeTransferId || row.transferredAt) {
          throw new Error("Cannot release a ledger row already transferred.")
        }

        await ctx.db.patch(row._id, {
          payoutRunId: undefined,
          payoutTransferId: undefined,
          status: "eligible",
          transferStatus: undefined,
          updatedAt: now,
        })
      }
    }

    await ctx.db.patch(run._id, {
      failureSummary: undefined,
      status: "canceled",
      updatedAt: now,
    })

    return await ctx.db.get(run._id)
  },
})
