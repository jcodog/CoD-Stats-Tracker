export const BILLING_INTERVALS = ["month", "year"] as const

export type BillingInterval = (typeof BILLING_INTERVALS)[number]

export const BILLING_SUBSCRIPTION_STATUSES = [
  "incomplete",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "paused",
  "incomplete_expired",
] as const

export type BillingSubscriptionStatus =
  (typeof BILLING_SUBSCRIPTION_STATUSES)[number]

export const BILLING_ATTENTION_STATUSES = [
  "none",
  "payment_failed",
  "past_due",
  "requires_action",
  "paused",
] as const

export type BillingAttentionStatus = (typeof BILLING_ATTENTION_STATUSES)[number]

export const BILLING_MANAGED_GRANT_MODES = ["timed", "indefinite"] as const

export type BillingManagedGrantMode =
  (typeof BILLING_MANAGED_GRANT_MODES)[number]

export const BILLING_MANAGED_GRANT_SOURCES = [
  "creator_approval",
] as const

export type BillingManagedGrantSource =
  (typeof BILLING_MANAGED_GRANT_SOURCES)[number]

export const BILLING_ACCESS_SOURCES = [
  "none",
  "legacy_plan",
  "paid_subscription",
  "creator_grant",
  "managed_grant_subscription",
] as const

export type BillingAccessSource = (typeof BILLING_ACCESS_SOURCES)[number]

export const BILLING_SCHEDULED_CHANGE_TYPES = [
  "cancel",
  "plan_change",
] as const

export type BillingScheduledChangeType =
  (typeof BILLING_SCHEDULED_CHANGE_TYPES)[number]

type BillingSubscriptionLifecycleLike = {
  canceledAt?: number | null
  currentPeriodEnd?: number | null
  endedAt?: number | null
  status: BillingSubscriptionStatus
}

type BillingManagedGrantLike = BillingSubscriptionLifecycleLike & {
  managedGrantSource?: BillingManagedGrantSource | null
  planKey?: string | null
}

export function isBillingInterval(value: unknown): value is BillingInterval {
  return BILLING_INTERVALS.includes(value as BillingInterval)
}

export function normalizeBillingInterval(
  value: unknown
): BillingInterval | null {
  return isBillingInterval(value) ? value : null
}

export function hasPaidSubscriptionAccess(status: BillingSubscriptionStatus) {
  return (
    status === "active" || status === "trialing" || status === "past_due"
  )
}

function normalizeTimestamp(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

export function hasBillingSubscriptionPeriodRemaining(
  subscription: BillingSubscriptionLifecycleLike,
  now = Date.now()
) {
  const endedAt = normalizeTimestamp(subscription.endedAt)

  if (endedAt !== undefined && endedAt <= now) {
    return false
  }

  const canceledAt = normalizeTimestamp(subscription.canceledAt)

  if (subscription.status === "canceled" && canceledAt !== undefined) {
    return canceledAt > now
  }

  const currentPeriodEnd = normalizeTimestamp(subscription.currentPeriodEnd)

  if (currentPeriodEnd !== undefined && currentPeriodEnd <= now) {
    return false
  }

  return true
}

export function hasEffectivePaidSubscriptionAccess(
  subscription: BillingSubscriptionLifecycleLike,
  now = Date.now()
) {
  return (
    hasPaidSubscriptionAccess(subscription.status) &&
    hasBillingSubscriptionPeriodRemaining(subscription, now)
  )
}

export function hasManagedCreatorGrantSubscriptionAccess(
  subscription: BillingManagedGrantLike,
  now = Date.now()
) {
  return (
    subscription.planKey === "creator" &&
    subscription.managedGrantSource === "creator_approval" &&
    hasEffectivePaidSubscriptionAccess(subscription, now)
  )
}

export function isManageableSubscriptionStatus(
  status: BillingSubscriptionStatus
) {
  return status !== "canceled" && status !== "incomplete_expired"
}

export function isManageableBillingSubscription(
  subscription: BillingSubscriptionLifecycleLike,
  now = Date.now()
) {
  return (
    isManageableSubscriptionStatus(subscription.status) &&
    hasBillingSubscriptionPeriodRemaining(subscription, now)
  )
}

export function isTerminalSubscriptionStatus(
  status: BillingSubscriptionStatus
) {
  return (
    status === "canceled" ||
    status === "unpaid" ||
    status === "incomplete_expired"
  )
}

export function maskIdentifier(
  value: string | undefined,
  options?: {
    full?: boolean
    keepEnd?: number
  }
) {
  if (!value) {
    return undefined
  }

  if (options?.full) {
    return value
  }

  const keepEnd = options?.keepEnd ?? 6

  if (value.length <= keepEnd) {
    return value
  }

  return `${value.slice(0, 4)}…${value.slice(-keepEnd)}`
}

export function unixSecondsToMillis(value: number | null | undefined) {
  if (!value) {
    return undefined
  }

  return value * 1000
}
