export type BillingAccessSource =
  | "creator_grant"
  | "legacy_plan"
  | "managed_grant_subscription"
  | "none"
  | "paid_subscription"

export type BillingAttentionStatus =
  | "none"
  | "past_due"
  | "paused"
  | "payment_failed"
  | "requires_action"

export type BillingInterval = "month" | "year"
export type SupportedPricingCurrency = "GBP" | "USD" | "CAD" | "EUR"
export type CheckoutCreatorDiscountState =
  | "applied"
  | "eligible_but_not_entered"
  | "not_eligible"
  | "rejected"

export type BillingAddress = {
  city?: string | null
  country?: string | null
  line1?: string | null
  line2?: string | null
  postalCode?: string | null
  state?: string | null
}

export type BillingTaxId = {
  country?: string | null
  stripeTaxIdId: string
  type: string
  value: string
  verificationStatus?: string | null
}

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
    month: {
      amount: number
      currency: string
      interval: "month"
    } | null
    year: {
      amount: number
      currency: string
      interval: "year"
    } | null
  }
  relationship: "checkout" | "current" | "downgrade" | "switch" | "upgrade"
  sortOrder: number
}

export type PricingCatalogResponse = {
  availableCurrencies: SupportedPricingCurrency[]
  currencyNotice: string | null
  currentInterval?: BillingInterval | null
  currentPlanKey: string | null
  plans: PricingCatalogPlan[]
  selectedCurrency: SupportedPricingCurrency
}

export type BillingResolvedState = {
  accessSource: BillingAccessSource
  appPlanKey: "free" | "premium" | "creator"
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
  hasCreatorAccess: boolean
  subscription?: {
    attentionStatus: BillingAttentionStatus
    cancelAt?: number
    cancelAtPeriodEnd: boolean
    currentPeriodEnd?: number
    currentPeriodStart?: number
    interval: BillingInterval
    managedGrantEndsAt?: number
    managedGrantMode?: "indefinite" | "timed"
    managedGrantSource?: "creator_approval"
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

export type BillingCenterData = {
  billingProfile: {
    address: BillingAddress | null
    businessName: string | null
    canEdit: boolean
    country: string | null
    defaultPaymentMethodId: string | null
    email: string | null
    name: string | null
    phone: string | null
    stripeCustomerId: string | null
    taxExempt: "exempt" | "none" | "reverse" | null
    taxIds: BillingTaxId[]
  }
  invoices: BillingCenterInvoice[]
  lastSyncedAt: number | null
  paymentMethods: BillingCenterPaymentMethod[]
  portalMode: "acquisition" | "management"
  subscriptions: BillingCenterSubscription[]
}

export type BillingCenterPaymentMethod = {
  address: BillingAddress | null
  bankName: string | null
  brand: string | null
  cardholderName: string | null
  expMonth: number | null
  expYear: number | null
  isDefault: boolean
  last4: string | null
  stripePaymentMethodId: string
  type: string
}

export type BillingCenterSubscription = {
  amount: number | null
  attentionStatus: BillingAttentionStatus
  billingInterval: BillingInterval
  cancelAt: number | null
  cancelAtPeriodEnd: boolean
  canceledAt: number | null
  currentPeriodEnd: number | null
  currentPeriodStart: number | null
  currency: string | null
  defaultPaymentMethodId: string | null
  defaultPaymentMethodSummary: {
    brand: string | null
    last4: string | null
    type: string
  } | null
  endedAt: number | null
  isManageable: boolean
  managedGrant: {
    endsAt: number | null
    mode: "indefinite" | "timed" | null
    source: "creator_approval"
  } | null
  planKey: string
  productName: string
  quantity: number
  scheduledChange: {
    effectiveAt: number
    interval: BillingInterval | null
    planKey: string | null
    planName: string | null
    type: "cancel" | "plan_change"
  } | null
  startedAt: number | null
  status:
    | "active"
    | "canceled"
    | "incomplete"
    | "incomplete_expired"
    | "past_due"
    | "paused"
    | "trialing"
    | "unpaid"
  stripeSubscriptionId: string
  trialEnd: number | null
  trialStart: number | null
}

export type BillingCenterInvoice = {
  amountDue: number
  amountPaid: number
  amountTotal: number
  currency: string
  description: string
  hostedInvoiceUrl: string | null
  invoiceNumber: string | null
  invoicePdfUrl: string | null
  issuedAt: number
  paymentMethodBrand: string | null
  paymentMethodLast4: string | null
  paymentMethodType: string | null
  relatedProductName: string | null
  relatedSubscriptionId: string | null
  status: string
  stripeInvoiceId: string
}

export type CheckoutIntentResult = {
  alreadyExists: boolean
  clientSecret?: string
  creatorCode?: string | null
  currency?: SupportedPricingCurrency
  currencyNotice?: string | null
  customerSessionClientSecret?: string
  defaultBillingEmail?: string
  interval: BillingInterval
  planKey: string
  requiresConfirmation: boolean
  secretType: "none" | "payment_intent" | "setup_intent"
  status: string
}

export type CheckoutSessionResult = {
  clientSecret: string
  creatorCode?: string | null
  currency: SupportedPricingCurrency
  currencyNotice: string | null
  interval: BillingInterval
  planKey: string
  sessionId: string
}

export type CheckoutSessionSyncResult = {
  paymentStatus: "no_payment_required" | "paid" | "unpaid" | null
  planKey: string | null
  sessionId: string
  status: "complete" | "expired" | "open"
  subscriptionId: string | null
  synced: boolean
}

export type CheckoutQuoteResult = {
  creatorDiscount: {
    amount: number
    appliedCode: string | null
    discountPercent: number | null
    entryState: CheckoutCreatorDiscountState
    message: string
    sourceLabel: string | null
  }
  currency: SupportedPricingCurrency
  currencyNotice: string | null
  firstPaymentTotal: number
  interval: BillingInterval
  planKey: string
  planName: string
  planSubtotal: number
  renewalTotal: number
}

export type BillingChangePreview = {
  amountDueNow: number
  creditApplied: number
  currentAmount: number
  currentInterval: BillingInterval
  currentPlanKey: string
  effectiveAt: number | null
  interval: BillingInterval
  mode:
    | "cancel_at_period_end"
    | "immediate_change"
    | "noop"
    | "scheduled_change"
  planKey: string
  prorationBehavior: "always_invoice" | "none"
  prorationDate: number | null
  proratedCharge: number
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
  effectiveAt: number | null
  mode: "cancel_at_period_end" | "cancel_immediately"
  status: string
}

export type ReactivationResult = {
  mode: "reactivated"
  status: string
}

export type BillingCenterSyncResult = {
  hasCustomer: boolean
  syncedAt: number
}

export type BillingProfileUpdateResult = {
  updated: boolean
}

export type PaymentMethodSetupIntentResult = {
  clientSecret: string
  secretType: "setup_intent"
}

export type PaymentMethodMutationResult = {
  defaultPaymentMethodId?: string
  removed?: boolean
  updated?: boolean
}
