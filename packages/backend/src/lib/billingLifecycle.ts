import Stripe from "stripe"

import {
  deriveAttentionStatus,
  getExpandedStripeCustomer,
  getInvoicePaymentIntentId,
  getStripeManagedGrantEndsAt,
  getStripeManagedGrantMode,
  getStripeManagedGrantSource,
  getStripeInvoiceId,
  getStripeProductId,
  getStripeScheduleId,
  getSubscriptionItemCurrentPeriodEnd,
  getSubscriptionItemCurrentPeriodStart,
  getStripeSubscriptionInterval,
  getStripeSubscriptionItem,
  mapStripeSubscriptionStatus,
  mapSubscriptionScheduleChange,
} from "./stripe/billing"

export type UserBillingContext = {
  accessGrant: object | null
  customer: {
    active?: boolean
    businessName?: string
    email?: string
    name?: string
    phone?: string
  } | null
  subscription: object | null
  user: {
    _id: string
    clerkUserId: string
    name: string
  }
}

type BillingAddressSnapshot = {
  city?: string
  country?: string
  line1?: string
  line2?: string
  postalCode?: string
  state?: string
}

type BillingTaxIdSnapshot = {
  country?: string
  stripeTaxIdId: string
  type: string
  value: string
  verificationStatus?: string
}

type BillingPlanPriceLookup = {
  key: string
}

type BillingPlanScheduleLookup = {
  key: string
  monthlyPriceId?: string
  yearlyPriceId?: string
}

type BillingPaymentMethodSnapshot = {
  bankName?: string
  billingAddress?: BillingAddressSnapshot
  brand?: string
  cardholderName?: string
  expMonth?: number
  expYear?: number
  last4?: string
  stripePaymentMethodId: string
  type: string
}

type BillingInvoiceSnapshot = {
  amountDue: number
  amountPaid: number
  amountTotal: number
  currency: string
  description: string
  hostedInvoiceUrl?: string
  invoiceIssuedAt: number
  invoiceNumber?: string
  invoicePdfUrl?: string
  paymentMethodBrand?: string
  paymentMethodLast4?: string
  paymentMethodType?: string
  status: string
  stripeInvoiceId: string
  stripePaymentIntentId?: string
  stripeSubscriptionId?: string
}

export type UpsertBillingCustomerInput = {
  active: boolean
  billingAddress?: BillingAddressSnapshot
  businessName?: string
  clerkUserId: string
  defaultPaymentMethodId?: string
  email?: string
  lastSyncedAt?: number
  name?: string
  phone?: string
  stripeCustomerId: string
  taxExempt?: "none" | "exempt" | "reverse"
  taxIds?: BillingTaxIdSnapshot[]
  userId: string
}

export type UpsertBillingSubscriptionInput = {
  attentionStatus:
    | "none"
    | "payment_failed"
    | "past_due"
    | "requires_action"
    | "paused"
  attentionUpdatedAt?: number
  cancelAt?: number
  cancelAtPeriodEnd: boolean
  canceledAt?: number
  clerkUserId: string
  clearScheduledChange?: boolean
  currentPeriodEnd?: number
  currentPeriodStart?: number
  defaultPaymentMethodId?: string
  endedAt?: number
  interval: "month" | "year"
  lastStripeEventId?: string
  managedGrantEndsAt?: number
  managedGrantMode?: "timed" | "indefinite"
  managedGrantSource?: "creator_approval"
  planKey: string
  quantity?: number
  scheduledChangeAt?: number
  scheduledChangeRequestedAt?: number
  scheduledChangeType?: "cancel" | "plan_change"
  scheduledInterval?: "month" | "year"
  scheduledPlanKey?: string
  startedAt?: number
  status:
    | "incomplete"
    | "trialing"
    | "active"
    | "past_due"
    | "canceled"
    | "unpaid"
    | "paused"
    | "incomplete_expired"
  stripeCustomerId: string
  stripeLatestInvoiceId?: string
  stripeLatestPaymentIntentId?: string
  stripePriceId: string
  stripeProductId?: string
  stripeScheduleId?: string
  stripeSubscriptionId: string
  stripeSubscriptionItemId?: string
  trialEnd?: number
  trialStart?: number
  userId: string
}

export type SyncBillingPaymentMethodsInput = {
  clerkUserId: string
  defaultPaymentMethodId?: string
  paymentMethods: BillingPaymentMethodSnapshot[]
  stripeCustomerId: string
  userId: string
}

export type SyncBillingInvoicesInput = {
  clerkUserId: string
  invoices: BillingInvoiceSnapshot[]
  stripeCustomerId: string
  userId: string
}

export type BillingLifecycleOps = {
  bindCreatorCodeUsageLock?(args: {
    clerkUserId: string
    creatorCode?: string
    creatorDiscountPercent?: number
    creatorPayoutPercent?: number
    creatorUsageLockId?: string
    normalizedCode?: string
    source?: "cookie" | "manual" | "staff"
    stripeCustomerId: string
    stripeSubscriptionId: string
    subscriptionStartedAt: number
    userId: string
  }): Promise<unknown>
  getBillingContextByStripeCustomerId(args: {
    stripeCustomerId: string
  }): Promise<UserBillingContext | null>
  getBillingPlans(
    args: Record<string, never>
  ): Promise<BillingPlanScheduleLookup[]>
  getPlanByStripePriceId(args: {
    stripePriceId: string
  }): Promise<BillingPlanPriceLookup | null>
  syncBillingInvoices(args: SyncBillingInvoicesInput): Promise<unknown>
  syncBillingPaymentMethods(
    args: SyncBillingPaymentMethodsInput
  ): Promise<unknown>
  upsertBillingCustomer(args: UpsertBillingCustomerInput): Promise<unknown>
  upsertBillingSubscription(
    args: UpsertBillingSubscriptionInput
  ): Promise<unknown>
}

type BillingLifecycleCtx = BillingLifecycleOps

export type ReconciledBillingCustomerResult = {
  billingContext: UserBillingContext
  stripeCustomer: Stripe.Customer | null
} | null

export type ReconciledStripeSubscriptionResult = {
  planKey: string
  status: Stripe.Subscription.Status
  stripeCustomerId: string
  subscriptionId: string
} | null

export type SyncedBillingCollectionResult = {
  count: number
  stripeCustomerId: string
} | null

async function getStripeCustomerIfAvailable(args: {
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined
  stripe: Stripe
}): Promise<Stripe.Customer | null> {
  const expandedCustomer = getExpandedStripeCustomer(args.customer)

  if (expandedCustomer) {
    return expandedCustomer
  }

  if (!args.customer || typeof args.customer !== "string") {
    return null
  }

  const customer = await args.stripe.customers.retrieve(args.customer)

  if ("deleted" in customer && customer.deleted) {
    return null
  }

  return customer
}

function getStripeDefaultPaymentMethodId(
  paymentMethod: string | Stripe.PaymentMethod | null | undefined
) {
  if (!paymentMethod) {
    return undefined
  }

  return typeof paymentMethod === "string" ? paymentMethod : paymentMethod.id
}

function normalizeBillingAddress(address: Stripe.Address | null | undefined) {
  if (!address) {
    return undefined
  }

  return {
    city: address.city ?? undefined,
    country: address.country ?? undefined,
    line1: address.line1 ?? undefined,
    line2: address.line2 ?? undefined,
    postalCode: address.postal_code ?? undefined,
    state: address.state ?? undefined,
  }
}

function getStripeMetadataValue(
  metadata: Stripe.Metadata | null | undefined,
  key: string
) {
  const value = metadata?.[key]
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined
}

function getStripeMetadataNumber(
  metadata: Stripe.Metadata | null | undefined,
  key: string
) {
  const value = getStripeMetadataValue(metadata, key)
  const parsedValue = value ? Number(value) : NaN

  return Number.isFinite(parsedValue) ? parsedValue : undefined
}

function normalizeCreatorCodeFromMetadata(value: string | undefined) {
  const normalizedCode = value
    ?.trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")

  return normalizedCode && /^[A-Z0-9]{3,24}$/.test(normalizedCode)
    ? normalizedCode
    : undefined
}

function getStripeCustomerBusinessName(customer: Stripe.Customer | null) {
  if (!customer) {
    return undefined
  }

  return customer.business_name ?? undefined
}

function getStripeCustomerPhone(customer: Stripe.Customer | null) {
  if (!customer) {
    return undefined
  }

  return customer.phone ?? undefined
}

async function listStripeCustomerTaxIds(args: {
  stripe: Stripe
  stripeCustomerId: string
}) {
  const taxIds = await args.stripe.customers.listTaxIds(args.stripeCustomerId, {
    limit: 20,
  })

  return [...taxIds.data]
    .map((taxId) => ({
      country: taxId.country ?? undefined,
      stripeTaxIdId: taxId.id,
      type: taxId.type,
      value: taxId.value,
      verificationStatus: taxId.verification?.status ?? undefined,
    }))
    .sort((left, right) =>
      left.stripeTaxIdId.localeCompare(right.stripeTaxIdId)
    )
}

function getExpandedPaymentMethod(
  paymentMethod: string | Stripe.PaymentMethod | null | undefined
) {
  if (!paymentMethod || typeof paymentMethod === "string") {
    return null
  }

  return paymentMethod
}

function getSafeHttpsUrl(value: string | null | undefined) {
  if (!value) {
    return undefined
  }

  try {
    const url = new URL(value)
    return url.protocol === "https:" ? url.toString() : undefined
  } catch {
    return undefined
  }
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice) {
  return invoice.parent?.type === "subscription_details" &&
    typeof invoice.parent.subscription_details?.subscription === "string"
    ? invoice.parent.subscription_details.subscription
    : undefined
}

function resolveInvoicePaymentMethod(
  invoice: Stripe.Invoice,
  paymentMethodsById: ReadonlyMap<string, Stripe.PaymentMethod>
) {
  for (const invoicePayment of invoice.payments?.data ?? []) {
    if (
      invoicePayment.payment.type !== "payment_intent" ||
      typeof invoicePayment.payment.payment_intent !== "object"
    ) {
      continue
    }

    const expandedPaymentMethod = getExpandedPaymentMethod(
      invoicePayment.payment.payment_intent.payment_method
    )

    if (expandedPaymentMethod) {
      return expandedPaymentMethod
    }

    const paymentMethodId = getStripeDefaultPaymentMethodId(
      invoicePayment.payment.payment_intent.payment_method
    )

    if (paymentMethodId) {
      return paymentMethodsById.get(paymentMethodId) ?? null
    }
  }

  const defaultPaymentMethod = getExpandedPaymentMethod(
    invoice.default_payment_method
  )

  if (defaultPaymentMethod) {
    return defaultPaymentMethod
  }

  const defaultPaymentMethodId = getStripeDefaultPaymentMethodId(
    invoice.default_payment_method
  )

  return defaultPaymentMethodId
    ? (paymentMethodsById.get(defaultPaymentMethodId) ?? null)
    : null
}

async function listInvoicePaymentMethods(args: {
  invoices: Stripe.Invoice[]
  stripe: Stripe
}) {
  const paymentMethodsById = new Map<string, Stripe.PaymentMethod>()
  const paymentMethodIds = new Set<string>()

  for (const invoice of args.invoices) {
    const defaultPaymentMethod = getExpandedPaymentMethod(
      invoice.default_payment_method
    )

    if (defaultPaymentMethod) {
      paymentMethodsById.set(defaultPaymentMethod.id, defaultPaymentMethod)
    }

    const defaultPaymentMethodId = getStripeDefaultPaymentMethodId(
      invoice.default_payment_method
    )

    if (defaultPaymentMethodId) {
      paymentMethodIds.add(defaultPaymentMethodId)
    }

    for (const invoicePayment of invoice.payments?.data ?? []) {
      if (
        invoicePayment.payment.type !== "payment_intent" ||
        typeof invoicePayment.payment.payment_intent !== "object"
      ) {
        continue
      }

      const expandedPaymentMethod = getExpandedPaymentMethod(
        invoicePayment.payment.payment_intent.payment_method
      )

      if (expandedPaymentMethod) {
        paymentMethodsById.set(expandedPaymentMethod.id, expandedPaymentMethod)
      }

      const paymentMethodId = getStripeDefaultPaymentMethodId(
        invoicePayment.payment.payment_intent.payment_method
      )

      if (paymentMethodId) {
        paymentMethodIds.add(paymentMethodId)
      }
    }
  }

  const missingPaymentMethodIds = Array.from(paymentMethodIds).filter(
    (paymentMethodId) => !paymentMethodsById.has(paymentMethodId)
  )

  const retrievals = await Promise.allSettled(
    missingPaymentMethodIds.map(async (paymentMethodId) => ({
      paymentMethod: await args.stripe.paymentMethods.retrieve(paymentMethodId),
      paymentMethodId,
    }))
  )

  for (const retrieval of retrievals) {
    if (retrieval.status !== "fulfilled") {
      continue
    }

    paymentMethodsById.set(
      retrieval.value.paymentMethodId,
      retrieval.value.paymentMethod
    )
  }

  return paymentMethodsById
}

export async function reconcileBillingCustomer(args: {
  active?: boolean
  ctx: BillingLifecycleCtx
  stripe: Stripe
  stripeCustomerId: string
}): Promise<ReconciledBillingCustomerResult> {
  const billingContext: UserBillingContext | null =
    await args.ctx.getBillingContextByStripeCustomerId({
      stripeCustomerId: args.stripeCustomerId,
    })

  if (!billingContext) {
    return null
  }

  const stripeCustomer = await getStripeCustomerIfAvailable({
    customer: args.stripeCustomerId,
    stripe: args.stripe,
  })
  const taxIds = stripeCustomer
    ? await listStripeCustomerTaxIds({
        stripe: args.stripe,
        stripeCustomerId: args.stripeCustomerId,
      })
    : []

  await args.ctx.upsertBillingCustomer({
    active: args.active ?? billingContext.customer?.active ?? true,
    billingAddress: normalizeBillingAddress(stripeCustomer?.address ?? null),
    businessName:
      getStripeCustomerBusinessName(stripeCustomer) ??
      billingContext.customer?.businessName ??
      undefined,
    clerkUserId: billingContext.user.clerkUserId,
    defaultPaymentMethodId: getStripeDefaultPaymentMethodId(
      stripeCustomer?.invoice_settings.default_payment_method
    ),
    email: stripeCustomer?.email ?? billingContext.customer?.email ?? undefined,
    lastSyncedAt: Date.now(),
    name:
      stripeCustomer?.name ??
      billingContext.customer?.name ??
      billingContext.user.name,
    phone:
      getStripeCustomerPhone(stripeCustomer) ??
      billingContext.customer?.phone ??
      undefined,
    stripeCustomerId: args.stripeCustomerId,
    taxExempt: stripeCustomer?.tax_exempt ?? undefined,
    taxIds,
    userId: billingContext.user._id,
  })

  return {
    billingContext,
    stripeCustomer,
  }
}

export async function reconcileStripeSubscription(args: {
  ctx: BillingLifecycleCtx
  invoiceEventType?:
    | "invoice.payment_action_required"
    | "invoice.payment_failed"
    | "invoice.payment_succeeded"
  lastStripeEventId?: string
  stripe: Stripe
  subscription: Stripe.Subscription
}): Promise<ReconciledStripeSubscriptionResult> {
  const stripeCustomerId =
    typeof args.subscription.customer === "string"
      ? args.subscription.customer
      : args.subscription.customer.id
  const billingContext: UserBillingContext | null =
    await args.ctx.getBillingContextByStripeCustomerId({
      stripeCustomerId,
    })

  if (!billingContext) {
    return null
  }

  const item = getStripeSubscriptionItem(args.subscription)
  const priceId = item.price.id
  const plan = await args.ctx.getPlanByStripePriceId({
    stripePriceId: priceId,
  })

  if (!plan) {
    throw new Error(
      `Billing plan not found for Stripe price ${priceId} on subscription ${args.subscription.id}.`
    )
  }

  const stripeCustomer = await getStripeCustomerIfAvailable({
    customer: args.subscription.customer,
    stripe: args.stripe,
  })

  await args.ctx.upsertBillingCustomer({
    active: true,
    clerkUserId: billingContext.user.clerkUserId,
    email: stripeCustomer?.email ?? billingContext.customer?.email ?? undefined,
    name:
      stripeCustomer?.name ??
      billingContext.customer?.name ??
      billingContext.user.name,
    stripeCustomerId,
    userId: billingContext.user._id,
  })

  const scheduleId = getStripeScheduleId(args.subscription.schedule)
  const schedule = scheduleId
    ? await args.stripe.subscriptionSchedules.retrieve(scheduleId)
    : null
  const priceIdToPlan = new Map<
    string,
    { interval: "month" | "year"; planKey: string }
  >()
  const plans = await args.ctx.getBillingPlans({})

  for (const currentPlan of plans) {
    if (currentPlan.monthlyPriceId) {
      priceIdToPlan.set(currentPlan.monthlyPriceId, {
        interval: "month",
        planKey: currentPlan.key,
      })
    }

    if (currentPlan.yearlyPriceId) {
      priceIdToPlan.set(currentPlan.yearlyPriceId, {
        interval: "year",
        planKey: currentPlan.key,
      })
    }
  }

  const scheduledChange = mapSubscriptionScheduleChange({
    priceIdToPlan,
    schedule,
    subscription: args.subscription,
  })

  await args.ctx.upsertBillingSubscription({
    attentionStatus: deriveAttentionStatus({
      invoiceEventType: args.invoiceEventType,
      subscription: args.subscription,
    }),
    attentionUpdatedAt: Date.now(),
    cancelAt:
      typeof args.subscription.cancel_at === "number"
        ? args.subscription.cancel_at * 1000
        : undefined,
    cancelAtPeriodEnd: args.subscription.cancel_at_period_end,
    canceledAt:
      typeof args.subscription.canceled_at === "number"
        ? args.subscription.canceled_at * 1000
        : undefined,
    clerkUserId: billingContext.user.clerkUserId,
    clearScheduledChange:
      scheduledChange.scheduledChangeType === undefined &&
      !args.subscription.cancel_at_period_end,
    currentPeriodEnd: getSubscriptionItemCurrentPeriodEnd(args.subscription),
    currentPeriodStart: getSubscriptionItemCurrentPeriodStart(
      args.subscription
    ),
    defaultPaymentMethodId: getStripeDefaultPaymentMethodId(
      args.subscription.default_payment_method
    ),
    endedAt:
      typeof args.subscription.ended_at === "number"
        ? args.subscription.ended_at * 1000
        : undefined,
    interval: getStripeSubscriptionInterval(args.subscription),
    lastStripeEventId: args.lastStripeEventId,
    managedGrantEndsAt: getStripeManagedGrantEndsAt(args.subscription),
    managedGrantMode: getStripeManagedGrantMode(args.subscription),
    managedGrantSource: getStripeManagedGrantSource(args.subscription),
    planKey: plan.key,
    quantity: item.quantity ?? 1,
    scheduledChangeAt: scheduledChange.scheduledChangeAt,
    scheduledChangeRequestedAt: scheduledChange.scheduledChangeRequestedAt,
    scheduledChangeType: scheduledChange.scheduledChangeType,
    scheduledInterval: scheduledChange.scheduledInterval,
    scheduledPlanKey: scheduledChange.scheduledPlanKey,
    startedAt:
      typeof args.subscription.start_date === "number"
        ? args.subscription.start_date * 1000
        : undefined,
    status: mapStripeSubscriptionStatus(args.subscription.status),
    stripeCustomerId,
    stripeLatestInvoiceId: getStripeInvoiceId(args.subscription.latest_invoice),
    stripeLatestPaymentIntentId: getInvoicePaymentIntentId(
      args.subscription.latest_invoice
    ),
    stripePriceId: priceId,
    stripeProductId: getStripeProductId(item.price.product),
    stripeScheduleId: scheduledChange.stripeScheduleId ?? scheduleId,
    stripeSubscriptionId: args.subscription.id,
    stripeSubscriptionItemId: item.id,
    trialEnd:
      typeof args.subscription.trial_end === "number"
        ? args.subscription.trial_end * 1000
        : undefined,
    trialStart:
      typeof args.subscription.trial_start === "number"
        ? args.subscription.trial_start * 1000
        : undefined,
    userId: billingContext.user._id,
  })

  const creatorCode = getStripeMetadataValue(
    args.subscription.metadata,
    "creatorCode"
  )
  const creatorUsageLockId = getStripeMetadataValue(
    args.subscription.metadata,
    "creatorUsageLockId"
  )

  if (
    args.ctx.bindCreatorCodeUsageLock &&
    (creatorCode || creatorUsageLockId)
  ) {
    const subscriptionStartedAt =
      typeof args.subscription.start_date === "number"
        ? args.subscription.start_date * 1000
        : Date.now()

    await args.ctx.bindCreatorCodeUsageLock({
      clerkUserId: billingContext.user.clerkUserId,
      creatorCode,
      creatorDiscountPercent: getStripeMetadataNumber(
        args.subscription.metadata,
        "creatorDiscountPercent"
      ),
      creatorPayoutPercent: getStripeMetadataNumber(
        args.subscription.metadata,
        "creatorPayoutPercent"
      ),
      creatorUsageLockId,
      normalizedCode: normalizeCreatorCodeFromMetadata(creatorCode),
      source: "manual",
      stripeCustomerId,
      stripeSubscriptionId: args.subscription.id,
      subscriptionStartedAt,
      userId: billingContext.user._id,
    })
  }

  return {
    planKey: plan.key,
    status: args.subscription.status,
    stripeCustomerId,
    subscriptionId: args.subscription.id,
  }
}

export async function reconcileStripeInvoice(args: {
  ctx: BillingLifecycleCtx
  eventType:
    | "invoice.payment_action_required"
    | "invoice.payment_failed"
    | "invoice.payment_succeeded"
  invoice: Stripe.Invoice
  lastStripeEventId?: string
  stripe: Stripe
}): Promise<ReconciledStripeSubscriptionResult> {
  const stripeCustomerId =
    typeof args.invoice.customer === "string"
      ? args.invoice.customer
      : undefined
  const stripeSubscriptionId =
    args.invoice.parent?.type === "subscription_details" &&
    typeof args.invoice.parent.subscription_details?.subscription === "string"
      ? args.invoice.parent.subscription_details.subscription
      : undefined

  if (stripeCustomerId) {
    await reconcileBillingCustomer({
      active: true,
      ctx: args.ctx,
      stripe: args.stripe,
      stripeCustomerId,
    })
    await syncBillingInvoicesForCustomer({
      ctx: args.ctx,
      stripe: args.stripe,
      stripeCustomerId,
    })
  }

  if (!stripeSubscriptionId) {
    return null
  }

  const subscription = await args.stripe.subscriptions.retrieve(
    stripeSubscriptionId,
    {
      expand: [
        "customer",
        "items.data.price.product",
        "latest_invoice.confirmation_secret",
        "latest_invoice.payment_intent",
        "pending_setup_intent",
        "schedule",
      ],
    }
  )

  const result = await reconcileStripeSubscription({
    ctx: args.ctx,
    invoiceEventType: args.eventType,
    lastStripeEventId: args.lastStripeEventId,
    stripe: args.stripe,
    subscription,
  })

  if (stripeCustomerId && result) {
    await syncBillingInvoicesForCustomer({
      ctx: args.ctx,
      stripe: args.stripe,
      stripeCustomerId,
    })
  }

  return result
}

export async function syncBillingPaymentMethodsForCustomer(args: {
  ctx: BillingLifecycleCtx
  stripe: Stripe
  stripeCustomerId: string
}): Promise<SyncedBillingCollectionResult> {
  const billingContext: UserBillingContext | null =
    await args.ctx.getBillingContextByStripeCustomerId({
      stripeCustomerId: args.stripeCustomerId,
    })

  if (!billingContext) {
    return null
  }

  const stripeCustomer = await getStripeCustomerIfAvailable({
    customer: args.stripeCustomerId,
    stripe: args.stripe,
  })
  const paymentMethods = await args.stripe.customers.listPaymentMethods(
    args.stripeCustomerId,
    {
      limit: 24,
    }
  )

  await args.ctx.syncBillingPaymentMethods({
    clerkUserId: billingContext.user.clerkUserId,
    defaultPaymentMethodId: getStripeDefaultPaymentMethodId(
      stripeCustomer?.invoice_settings.default_payment_method
    ),
    paymentMethods: paymentMethods.data.map((paymentMethod) => ({
      bankName:
        paymentMethod.us_bank_account?.bank_name ??
        paymentMethod.sepa_debit?.bank_code ??
        undefined,
      billingAddress: normalizeBillingAddress(
        paymentMethod.billing_details.address
      ),
      brand:
        paymentMethod.card?.brand ??
        paymentMethod.us_bank_account?.bank_name ??
        undefined,
      cardholderName: paymentMethod.billing_details.name ?? undefined,
      expMonth: paymentMethod.card?.exp_month ?? undefined,
      expYear: paymentMethod.card?.exp_year ?? undefined,
      last4:
        paymentMethod.card?.last4 ??
        paymentMethod.us_bank_account?.last4 ??
        paymentMethod.sepa_debit?.last4 ??
        undefined,
      stripePaymentMethodId: paymentMethod.id,
      type: paymentMethod.type,
    })),
    stripeCustomerId: args.stripeCustomerId,
    userId: billingContext.user._id,
  })

  return {
    count: paymentMethods.data.length,
    stripeCustomerId: args.stripeCustomerId,
  }
}

export async function syncBillingInvoicesForCustomer(args: {
  ctx: BillingLifecycleCtx
  limit?: number
  stripe: Stripe
  stripeCustomerId: string
}): Promise<SyncedBillingCollectionResult> {
  const billingContext: UserBillingContext | null =
    await args.ctx.getBillingContextByStripeCustomerId({
      stripeCustomerId: args.stripeCustomerId,
    })

  if (!billingContext) {
    return null
  }

  const invoicePage = await args.stripe.invoices.list({
    customer: args.stripeCustomerId,
    expand: ["data.default_payment_method"],
    limit: args.limit ?? 36,
  })
  // Stripe allows `payments.data.payment.payment_intent` on invoice retrieval,
  // but not on invoice lists because the leading `data` pushes list expansion
  // depth beyond the documented four-level limit.
  const invoices = await Promise.all(
    invoicePage.data.map(async (invoice) => {
      try {
        return await args.stripe.invoices.retrieve(invoice.id, {
          expand: [
            "default_payment_method",
            "payments.data.payment.payment_intent",
          ],
        })
      } catch {
        return invoice
      }
    })
  )
  const paymentMethodsById = await listInvoicePaymentMethods({
    invoices,
    stripe: args.stripe,
  })

  await args.ctx.syncBillingInvoices({
    clerkUserId: billingContext.user.clerkUserId,
    invoices: invoices.map((invoice) => {
      const paymentMethod = resolveInvoicePaymentMethod(
        invoice,
        paymentMethodsById
      )

      return {
        amountDue: invoice.amount_due,
        amountPaid: invoice.amount_paid,
        amountTotal: invoice.total,
        currency: invoice.currency,
        description:
          invoice.lines.data[0]?.description ??
          invoice.description ??
          invoice.number ??
          "Subscription invoice",
        hostedInvoiceUrl: getSafeHttpsUrl(invoice.hosted_invoice_url),
        invoiceIssuedAt: invoice.created * 1000,
        invoiceNumber: invoice.number ?? undefined,
        invoicePdfUrl: getSafeHttpsUrl(invoice.invoice_pdf),
        paymentMethodBrand:
          paymentMethod?.card?.brand ??
          paymentMethod?.us_bank_account?.bank_name ??
          undefined,
        paymentMethodLast4:
          paymentMethod?.card?.last4 ??
          paymentMethod?.us_bank_account?.last4 ??
          paymentMethod?.sepa_debit?.last4 ??
          undefined,
        paymentMethodType: paymentMethod?.type ?? undefined,
        status: invoice.status ?? "draft",
        stripeInvoiceId: invoice.id,
        stripePaymentIntentId: getInvoicePaymentIntentId(invoice),
        stripeSubscriptionId: getInvoiceSubscriptionId(invoice),
      }
    }),
    stripeCustomerId: args.stripeCustomerId,
    userId: billingContext.user._id,
  })

  return {
    count: invoices.length,
    stripeCustomerId: args.stripeCustomerId,
  }
}
