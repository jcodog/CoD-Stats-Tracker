export const CREATOR_PAYOUT_WINDOW_MONTHS = 6

export type CreatorEarningLedgerStatus =
  | "pending"
  | "eligible"
  | "void"
  | "reversed"
  | "future_transfer_pending"

export function addUtcMonthsClamped(timestamp: number, months: number) {
  const source = new Date(timestamp)
  const targetMonthIndex = source.getUTCMonth() + months
  const targetYear = source.getUTCFullYear() + Math.floor(targetMonthIndex / 12)
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12
  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0)
  ).getUTCDate()
  const targetDay = Math.min(source.getUTCDate(), lastDayOfTargetMonth)

  return Date.UTC(
    targetYear,
    targetMonth,
    targetDay,
    source.getUTCHours(),
    source.getUTCMinutes(),
    source.getUTCSeconds(),
    source.getUTCMilliseconds()
  )
}

export function calculateCreatorPayoutEligibilityEndsAt(
  attributionStartedAt: number
) {
  return addUtcMonthsClamped(attributionStartedAt, CREATOR_PAYOUT_WINDOW_MONTHS)
}

export function isCreatorInvoiceInsidePayoutWindow(args: {
  attributionStartedAt: number
  invoiceIssuedAt: number
  payoutEligibilityEndsAt: number
}) {
  return (
    args.invoiceIssuedAt >= args.attributionStartedAt &&
    args.invoiceIssuedAt < args.payoutEligibilityEndsAt
  )
}

export function calculateCreatorEarningAmount(args: {
  amountPaid: number
  payoutPercent: number
}) {
  if (args.amountPaid <= 0 || args.payoutPercent <= 0) {
    return 0
  }

  return Math.max(0, Math.round((args.amountPaid * args.payoutPercent) / 100))
}

export function isPaidSubscriptionInvoiceEligibleForCreatorEarning(args: {
  amountPaid: number
  attributionStartedAt: number
  invoiceIssuedAt: number
  payoutEligibilityEndsAt: number
  status: string
  stripeSubscriptionId?: string
}) {
  return (
    args.status === "paid" &&
    args.amountPaid > 0 &&
    Boolean(args.stripeSubscriptionId) &&
    isCreatorInvoiceInsidePayoutWindow(args)
  )
}

export function getCreatorEarningStatusForPaidInvoice(args: {
  payoutEligible: boolean
}): CreatorEarningLedgerStatus {
  return args.payoutEligible ? "eligible" : "pending"
}

export function isCreatorEarningEstimateStatus(
  status: CreatorEarningLedgerStatus
) {
  return (
    status === "eligible" ||
    status === "pending" ||
    status === "future_transfer_pending"
  )
}

export function isSelfCreatorCode(args: {
  creatorUserId: string
  userId: string
}) {
  return args.creatorUserId === args.userId
}
