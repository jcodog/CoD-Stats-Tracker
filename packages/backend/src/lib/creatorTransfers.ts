import { STRIPE_CATALOG_APP } from "./stripe/client"

export type CreatorTransferLedgerStatus =
  | "pending"
  | "eligible"
  | "void"
  | "reversed"
  | "future_transfer_pending"
  | "reserved"
  | "transferred"
  | "transfer_failed"
  | "transfer_requires_review"

export type CreatorPayoutRunStatus =
  | "canceled"
  | "cancelled"
  | "completed"
  | "draft"
  | "failed"
  | "executing"
  | "partial_failed"
  | "partially_transferred"
  | "processing"
  | "requires_review"
  | "transferred"

export type CreatorPayoutTransferStatus =
  | "cancelled"
  | "draft"
  | "failed"
  | "requires_review"
  | "transferred"
  | "transferring"

export type CreatorPayoutRunSource =
  | "dry_run_review"
  | "manual"
  | "scheduled"

export type CreatorPayoutTransferSource =
  | "dry_run_review"
  | "manual_retry"
  | "scheduled"

export type CreatorTransferReadinessBlockerCode =
  | "connect_requirements_due"
  | "connect_status_stale"
  | "connect_status_not_refreshed"
  | "missing_connect_account"
  | "missing_creator_account"
  | "payout_eligibility_paused"
  | "payouts_not_enabled"
  | "stripe_transfer_capability_inactive"

export type CreatorTransferReadinessBlocker = {
  code: CreatorTransferReadinessBlockerCode
  message: string
}

export type CreatorTransferLedgerRow = {
  _id: string
  creatorAccountId: string
  creatorCode: string
  currency: string
  earningAmount: number
  invoiceIssuedAt: number
  payoutRunId?: string
  payoutTransferId?: string
  status: CreatorTransferLedgerStatus
  stripeTransferId?: string
  transferStatus?: CreatorPayoutTransferStatus
  transferredAt?: number
}

export type CreatorTransferAccount = {
  _id: string
  chargesEnabled?: boolean | null
  code: string
  connectStatusUpdatedAt?: number | null
  detailsSubmitted?: boolean | null
  payoutEligible: boolean
  payoutsEnabled?: boolean | null
  requirementsCurrentlyDue?: string[] | null
  requirementsDue?: string[] | null
  requirementsPastDue?: string[] | null
  stripeConnectedAccountVersion?: "v1" | "v2" | null
  stripeConnectedAccountId?: string | null
}

export type CreatorPayoutTransferPreviewGroup = {
  amount: number
  blockers: CreatorTransferReadinessBlocker[]
  creatorAccountId: string
  creatorCode: string
  currency: string
  ledgerEntryCount: number
  ledgerEntryIds: string[]
  ready: boolean
  stripeConnectedAccountId: string | null
}

export type CreatorPayoutPreview = {
  blockedGroups: CreatorPayoutTransferPreviewGroup[]
  currencyTotals: Array<{ amount: number; currency: string }>
  excludedCount: number
  readyCreatorCount: number
  readyGroups: CreatorPayoutTransferPreviewGroup[]
  selectedLedgerEntryIds: string[]
  totalEligibleAmount: number
  transferCount: number
}

export type CreatorPayoutPeriod = {
  periodEnd: number
  periodStart: number
}

export type StripeTransferCreator = {
  transfers: {
    create: (
      params: {
        amount: number
        currency: string
        destination: string
        metadata: Record<string, string>
      },
      options: { idempotencyKey: string }
    ) => Promise<{ id: string }>
  }
}

export const CREATOR_CONNECT_STATUS_STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000

function toNormalizedCurrency(value: string) {
  return value.trim().toLowerCase()
}

function hasEntries(value: string[] | null | undefined) {
  return (value?.length ?? 0) > 0
}

export function getCreatorTransferReadiness(
  account: CreatorTransferAccount | null | undefined,
  options?: { now?: number; staleAfterMs?: number }
) {
  const blockers: CreatorTransferReadinessBlocker[] = []
  const now = options?.now ?? Date.now()
  const staleAfterMs =
    options?.staleAfterMs ?? CREATOR_CONNECT_STATUS_STALE_AFTER_MS

  if (!account) {
    return {
      blockers: [
        {
          code: "missing_creator_account" as const,
          message: "Creator account not found.",
        },
      ],
      ready: false,
    }
  }

  if (!account.payoutEligible) {
    blockers.push({
      code: "payout_eligibility_paused",
      message: "Creator payout eligibility is paused.",
    })
  }

  if (!account.stripeConnectedAccountId) {
    blockers.push({
      code: "missing_connect_account",
      message: "Missing Stripe connected account.",
    })
  }

  if (!account.connectStatusUpdatedAt) {
    blockers.push({
      code: "connect_status_not_refreshed",
      message: "Stripe Connect status has not been refreshed.",
    })
  } else if (now - account.connectStatusUpdatedAt > staleAfterMs) {
    blockers.push({
      code: "connect_status_stale",
      message: "Stripe Connect status is stale and must be refreshed.",
    })
  }

  if (
    account.detailsSubmitted === false ||
    hasEntries(account.requirementsDue) ||
    hasEntries(account.requirementsCurrentlyDue) ||
    hasEntries(account.requirementsPastDue)
  ) {
    blockers.push({
      code: "connect_requirements_due",
      message: "Stripe Connect requirements are still due.",
    })
  }

  // Accounts v2 exposes recipient transfer readiness through the
  // stripe_balance.stripe_transfers capability. Legacy v1 accounts use the
  // transfers capability; this code stores that capability snapshot in the
  // existing chargesEnabled field after refresh. We still require payoutsEnabled
  // so automated transfers do not push funds into accounts Stripe cannot pay out.
  if (account.payoutsEnabled !== true) {
    blockers.push({
      code: "payouts_not_enabled",
      message: "Stripe payouts are not enabled for the connected account.",
    })
  }

  if (account.chargesEnabled !== true) {
    blockers.push({
      code: "stripe_transfer_capability_inactive",
      message: "Stripe transfer capability is not active.",
    })
  }

  return {
    blockers,
    ready: blockers.length === 0,
  }
}

export function isCreatorLedgerRowTransferable(row: CreatorTransferLedgerRow) {
  return (
    row.status === "eligible" &&
    row.earningAmount > 0 &&
    !row.payoutRunId &&
    !row.payoutTransferId &&
    !row.stripeTransferId &&
    !row.transferredAt &&
    !row.transferStatus
  )
}

export function summarizeCreatorPayoutCurrencyTotals(
  groups: Array<Pick<CreatorPayoutTransferPreviewGroup, "amount" | "currency">>
) {
  return Array.from(
    groups
      .reduce((totals, group) => {
        totals.set(group.currency, (totals.get(group.currency) ?? 0) + group.amount)
        return totals
      }, new Map<string, number>())
      .entries()
  )
    .map(([currency, amount]) => ({ amount, currency }))
    .sort((left, right) => left.currency.localeCompare(right.currency))
}

export function buildCreatorPayoutPreview(args: {
  creatorAccounts: CreatorTransferAccount[]
  ledgerRows: CreatorTransferLedgerRow[]
  now?: number
  periodEnd?: number
  periodStart?: number
  selectedLedgerEntryIds?: string[]
}): CreatorPayoutPreview {
  const selectedIds = args.selectedLedgerEntryIds
    ? new Set(args.selectedLedgerEntryIds)
    : null
  const accountById = new Map(
    args.creatorAccounts.map((account) => [account._id, account])
  )
  const groupedRows = new Map<
    string,
    {
      account: CreatorTransferAccount | null
      amount: number
      creatorAccountId: string
      creatorCode: string
      currency: string
      ledgerEntryIds: string[]
    }
  >()
  let excludedCount = 0

  for (const row of args.ledgerRows) {
    if (selectedIds && !selectedIds.has(row._id)) {
      continue
    }

    if (
      args.periodStart !== undefined &&
      row.invoiceIssuedAt < args.periodStart
    ) {
      continue
    }

    if (args.periodEnd !== undefined && row.invoiceIssuedAt > args.periodEnd) {
      continue
    }

    if (!isCreatorLedgerRowTransferable(row)) {
      excludedCount += 1
      continue
    }

    const account = accountById.get(row.creatorAccountId) ?? null
    const currency = toNormalizedCurrency(row.currency)
    const key = `${row.creatorAccountId}:${currency}`
    const group =
      groupedRows.get(key) ??
      {
        account,
        amount: 0,
        creatorAccountId: row.creatorAccountId,
        creatorCode: account?.code ?? row.creatorCode,
        currency,
        ledgerEntryIds: [],
      }

    group.amount += row.earningAmount
    group.ledgerEntryIds.push(row._id)
    groupedRows.set(key, group)
  }

  const groups = Array.from(groupedRows.values()).map((group) => {
    const readiness = getCreatorTransferReadiness(group.account, {
      now: args.now,
    })

    return {
      amount: group.amount,
      blockers: readiness.blockers,
      creatorAccountId: group.creatorAccountId,
      creatorCode: group.creatorCode,
      currency: group.currency,
      ledgerEntryCount: group.ledgerEntryIds.length,
      ledgerEntryIds: group.ledgerEntryIds,
      ready: readiness.ready,
      stripeConnectedAccountId: group.account?.stripeConnectedAccountId ?? null,
    } satisfies CreatorPayoutTransferPreviewGroup
  })
  const readyGroups = groups
    .filter((group) => group.ready)
    .sort(
      (left, right) =>
        left.creatorCode.localeCompare(right.creatorCode) ||
        left.currency.localeCompare(right.currency)
    )
  const blockedGroups = groups
    .filter((group) => !group.ready)
    .sort(
      (left, right) =>
        left.creatorCode.localeCompare(right.creatorCode) ||
        left.currency.localeCompare(right.currency)
    )
  const selectedLedgerEntryIds = readyGroups.flatMap(
    (group) => group.ledgerEntryIds
  )

  return {
    blockedGroups,
    currencyTotals: summarizeCreatorPayoutCurrencyTotals(readyGroups),
    excludedCount,
    readyCreatorCount: new Set(
      readyGroups.map((group) => group.creatorAccountId)
    ).size,
    readyGroups,
    selectedLedgerEntryIds,
    totalEligibleAmount: readyGroups.reduce(
      (total, group) => total + group.amount,
      0
    ),
    transferCount: readyGroups.length,
  }
}

export function buildCreatorPayoutTransferIdempotencyKey(args: {
  payoutTransferId: string
}) {
  return [STRIPE_CATALOG_APP, "creator-transfer", args.payoutTransferId].join(
    ":"
  )
}

export function buildCreatorPayoutTransferMetadata(args: {
  creatorAccountId: string
  creatorCode: string
  ledgerEntryCount: number
  payoutRunId: string
  payoutTransferId: string
}) {
  return {
    app: STRIPE_CATALOG_APP,
    creatorAccountId: args.creatorAccountId,
    creatorCode: args.creatorCode,
    ledgerEntryCount: String(args.ledgerEntryCount),
    payoutRunId: args.payoutRunId,
    payoutTransferId: args.payoutTransferId,
  }
}

export async function createCreatorStripeTransfer(args: {
  amount: number
  creatorAccountId: string
  creatorCode: string
  currency: string
  idempotencyKey: string
  ledgerEntryCount: number
  payoutRunId: string
  payoutTransferId: string
  stripe: StripeTransferCreator
  stripeConnectedAccountId: string
}) {
  return await args.stripe.transfers.create(
    {
      amount: args.amount,
      currency: args.currency.toLowerCase(),
      destination: args.stripeConnectedAccountId,
      metadata: buildCreatorPayoutTransferMetadata({
        creatorAccountId: args.creatorAccountId,
        creatorCode: args.creatorCode,
        ledgerEntryCount: args.ledgerEntryCount,
        payoutRunId: args.payoutRunId,
        payoutTransferId: args.payoutTransferId,
      }),
    },
    {
      idempotencyKey: args.idempotencyKey,
    }
  )
}

export function getPreviousCompletedMonthlyPayoutPeriod(
  now: number = Date.now()
): CreatorPayoutPeriod {
  const date = new Date(now)
  const periodEndExclusive = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    1
  )
  const periodStart = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth() - 1,
    1
  )

  return {
    periodEnd: periodEndExclusive - 1,
    periodStart,
  }
}
