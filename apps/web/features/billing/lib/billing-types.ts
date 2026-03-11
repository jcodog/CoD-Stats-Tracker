export type BillingAccessSource =
  | "creator_grant"
  | "legacy_plan"
  | "none"
  | "paid_subscription"

export type BillingAttentionStatus =
  | "none"
  | "past_due"
  | "paused"
  | "payment_failed"
  | "requires_action"

export type BillingInterval = "month" | "year"

export type PricingCatalogPlan = {
  active: boolean
  description: string
  features: Array<{
    category?: string
    description: string
    featureKey: string
    name: string
  }>
  name: string
  planKey: string
  planType: "free" | "paid"
  pricing: {
    month:
      | {
          amount: number
          currency: string
          interval: "month"
        }
      | null
    year:
      | {
          amount: number
          currency: string
          interval: "year"
        }
      | null
  }
  relationship: "checkout" | "current" | "downgrade" | "switch" | "upgrade"
  sortOrder: number
}

export type PricingCatalogResponse = {
  currentInterval?: BillingInterval | null
  currentPlanKey: string | null
  plans: PricingCatalogPlan[]
}

export type BillingResolvedState = {
  accessSource: BillingAccessSource
  attentionStatus: BillingAttentionStatus
  creatorGrant?: {
    endsAt?: number
    planKey: string
    reason: string
    source: "creator_approval" | "manual" | "promo"
  } | null
  effectiveFeatures: Array<{
    category?: string
    description: string
    key: string
    name: string
  }>
  effectivePlan?: {
    description: string
    key: string
    name: string
    planType: "free" | "paid"
  } | null
  effectivePlanKey: string | null
  hasActiveAccess: boolean
  subscription?: {
    attentionStatus: BillingAttentionStatus
    cancelAt?: number
    cancelAtPeriodEnd: boolean
    currentPeriodEnd?: number
    currentPeriodStart?: number
    interval: BillingInterval
    planKey: string
    scheduledChangeAt?: number
    scheduledChangeType?: "cancel" | "plan_change"
    scheduledInterval?: BillingInterval
    scheduledPlanKey?: string
    status:
      | "active"
      | "canceled"
      | "incomplete"
      | "incomplete_expired"
      | "past_due"
      | "paused"
      | "trialing"
      | "unpaid"
  } | null
  upcomingChange?: {
    effectiveAt: number
    interval?: BillingInterval
    planKey?: string
    type: "cancel" | "plan_change"
  } | null
}

export type CheckoutIntentResult = {
  alreadyExists: boolean
  clientSecret?: string
  customerSessionClientSecret?: string
  defaultBillingEmail?: string
  interval: BillingInterval
  planKey: string
  requiresConfirmation: boolean
  secretType: "none" | "payment_intent" | "setup_intent"
  status: string
}

export type BillingChangePreview = {
  amountDueNow: number
  currentAmount: number
  currentInterval: BillingInterval
  currentPlanKey: string
  effectiveAt: number | null
  interval: BillingInterval
  mode: "cancel_at_period_end" | "immediate_change" | "noop" | "scheduled_change"
  planKey: string
  prorationBehavior: "always_invoice" | "none"
  summary: string
  targetAmount: number
}

export type BillingChangeResult = {
  clientSecret?: string
  effectiveAt: number
  mode: "cancel_at_period_end" | "immediate_change" | "scheduled_change"
  requiresConfirmation: boolean
  secretType?: "none" | "payment_intent" | "setup_intent"
  status?: string
}

export type CancellationResult = {
  effectiveAt: number
  mode: "cancel_at_period_end"
}

export type ReactivationResult = {
  mode: "reactivated"
  status: string
}

export type InvoiceHistoryEntry = {
  amountDue: number
  amountPaid: number
  createdAt: number
  currency: string
  description: string
  hostedInvoiceUrl?: string
  interval?: BillingInterval
  invoiceNumber?: string
  invoicePdfUrl?: string
  status: string
}
