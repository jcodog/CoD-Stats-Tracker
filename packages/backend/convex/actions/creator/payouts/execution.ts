"use node"

import Stripe from "stripe"

import { internal } from "../../../_generated/api"
import type { Id } from "../../../_generated/dataModel"
import type { ActionCtx } from "../../../_generated/server"
import {
  mapStripeConnectedAccountV2Snapshot,
  mapStripeConnectedAccountSnapshot,
} from "../../../../src/lib/creator/program"
import {
  createCreatorStripeTransfer,
  getCreatorTransferReadiness,
  type CreatorPayoutTransferSource,
  type StripeTransferCreator,
} from "../../../../src/lib/creator/payouts/transfers"
import {
  isStripeV2CompatibilityError,
  retrieveStripeAccountV2,
} from "../../../../src/lib/stripe/connect"
import { getStripe } from "../../../../src/lib/stripe/client"

type CreatorConnectedAccountSnapshot =
  | ReturnType<typeof mapStripeConnectedAccountV2Snapshot>
  | (ReturnType<typeof mapStripeConnectedAccountSnapshot> & {
      stripeConnectedAccountVersion: "v1"
    })

export type ExecutableCreatorPayoutTransfer = {
  _id: Id<"creatorPayoutTransfers">
  amount: number
  creatorAccountId: Id<"creatorAccounts">
  creatorCode: string
  currency: string
  idempotencyKey: string
  ledgerEntryIds: Array<Id<"creatorEarningLedger">>
  payoutRunId: Id<"creatorPayoutRuns">
  status: "draft" | "failed" | "requires_review" | "transferring"
  stripeConnectedAccountId: string
}

export function getStripeTransferFailure(error: unknown) {
  const code =
    error instanceof Stripe.errors.StripeError
      ? error.code
      : error instanceof Error && "code" in error
        ? String(error.code)
        : undefined
  const message =
    error instanceof Error ? error.message : "Stripe transfer failed."
  const requiresReview =
    code === "balance_insufficient" ||
    message.toLowerCase().includes("insufficient funds")

  return {
    code,
    message,
    status: requiresReview ? ("requires_review" as const) : ("failed" as const),
  }
}

async function syncCreatorProgramConnectAccount(args: {
  creatorAccountId: Id<"creatorAccounts">
  ctx: ActionCtx
  stripeConnectedAccountId: string
}) {
  let snapshot: CreatorConnectedAccountSnapshot

  try {
    const account = await retrieveStripeAccountV2(args.stripeConnectedAccountId)
    snapshot = mapStripeConnectedAccountV2Snapshot(account)
  } catch (error) {
    if (!isStripeV2CompatibilityError(error)) {
      throw error
    }

    const stripe = getStripe()
    const account = await stripe.accounts.retrieve(
      args.stripeConnectedAccountId
    )
    snapshot = {
      ...mapStripeConnectedAccountSnapshot(account),
      stripeConnectedAccountVersion: "v1" as const,
    }
  }

  await args.ctx.runMutation(
    internal.mutations.creator.accounts.internal.applyStripeConnectedAccountSnapshot,
    {
      ...snapshot,
      creatorAccountId: args.creatorAccountId,
    }
  )

  return snapshot
}

export async function executeCreatorPayoutTransfer(args: {
  allowedStatuses: Array<
    "draft" | "failed" | "requires_review" | "transferring"
  >
  ctx: ActionCtx
  maxTransferAmountMinorUnits?: number
  now?: number
  source?: CreatorPayoutTransferSource
  stripe?: StripeTransferCreator
  syncConnectAccount?: typeof syncCreatorProgramConnectAccount
  transfer: ExecutableCreatorPayoutTransfer
}) {
  const executingTransfer = await args.ctx.runMutation(
    internal.mutations.staff.payouts.markCreatorPayoutTransferExecuting,
    {
      allowedStatuses: args.allowedStatuses,
      payoutTransferId: args.transfer._id,
      source: args.source,
    }
  )

  if (!executingTransfer) {
    throw new Error("Creator payout transfer not found.")
  }

  if (
    args.maxTransferAmountMinorUnits !== undefined &&
    args.transfer.amount > args.maxTransferAmountMinorUnits
  ) {
    await args.ctx.runMutation(
      internal.mutations.staff.payouts.markCreatorPayoutTransferFailed,
      {
        failureCode: "max_transfer_amount_exceeded",
        failureMessage:
          "Creator transfer exceeds the configured automatic transfer guardrail.",
        payoutTransferId: args.transfer._id,
        status: "requires_review",
      }
    )

    return "requires_review" as const
  }

  const creatorAccount = await args.ctx.runQuery(
    internal.queries.creator.accounts.internal.getCreatorAccountById,
    {
      creatorAccountId: args.transfer.creatorAccountId,
    }
  )

  if (!creatorAccount) {
    await args.ctx.runMutation(
      internal.mutations.staff.payouts.markCreatorPayoutTransferFailed,
      {
        failureCode: "missing_creator_account",
        failureMessage: "Creator account no longer exists.",
        payoutTransferId: args.transfer._id,
        status: "requires_review",
      }
    )

    return "requires_review" as const
  }

  const syncConnectAccount =
    args.syncConnectAccount ?? syncCreatorProgramConnectAccount
  const snapshot = await syncConnectAccount({
    creatorAccountId: args.transfer.creatorAccountId,
    ctx: args.ctx,
    stripeConnectedAccountId: args.transfer.stripeConnectedAccountId,
  }).catch(async (error) => {
    await args.ctx.runMutation(
      internal.mutations.staff.payouts.markCreatorPayoutTransferFailed,
      {
        failureCode: "connect_readiness_refresh_failed",
        failureMessage:
          error instanceof Error
            ? error.message
            : "Unable to refresh Stripe Connect readiness.",
        payoutTransferId: args.transfer._id,
        status: "requires_review",
      }
    )

    return null
  })

  if (!snapshot) {
    return "requires_review" as const
  }

  const readiness = getCreatorTransferReadiness(
    {
      ...snapshot,
      _id: creatorAccount._id,
      code: creatorAccount.code,
      payoutEligible: creatorAccount.payoutEligible,
    },
    { now: args.now }
  )

  if (!readiness.ready) {
    await args.ctx.runMutation(
      internal.mutations.staff.payouts.markCreatorPayoutTransferFailed,
      {
        failureCode: readiness.blockers[0]?.code,
        failureMessage: readiness.blockers
          .map((blocker) => blocker.message)
          .join(" "),
        payoutTransferId: args.transfer._id,
        status: "requires_review",
      }
    )

    return "requires_review" as const
  }

  try {
    const stripeTransfer = await createCreatorStripeTransfer({
      amount: args.transfer.amount,
      creatorAccountId: args.transfer.creatorAccountId,
      creatorCode: args.transfer.creatorCode,
      currency: args.transfer.currency,
      idempotencyKey: args.transfer.idempotencyKey,
      ledgerEntryCount: args.transfer.ledgerEntryIds.length,
      payoutRunId: args.transfer.payoutRunId,
      payoutTransferId: args.transfer._id,
      stripe: args.stripe ?? getStripe(),
      stripeConnectedAccountId: args.transfer.stripeConnectedAccountId,
    })

    await args.ctx.runMutation(
      internal.mutations.staff.payouts.markCreatorPayoutTransferSucceeded,
      {
        payoutTransferId: args.transfer._id,
        stripeTransferId: stripeTransfer.id,
        transferredAt: args.now ?? Date.now(),
      }
    )

    return "transferred" as const
  } catch (error) {
    const failure = getStripeTransferFailure(error)

    await args.ctx.runMutation(
      internal.mutations.staff.payouts.markCreatorPayoutTransferFailed,
      {
        failureCode: failure.code,
        failureMessage: failure.message,
        payoutTransferId: args.transfer._id,
        status: failure.status,
      }
    )

    return failure.status
  }
}
