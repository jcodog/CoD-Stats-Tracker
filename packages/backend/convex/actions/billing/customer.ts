"use node"

import Stripe from "stripe"
import { v } from "convex/values"

import type { Id } from "../../_generated/dataModel"
import { internal } from "../../_generated/api"
import { action, type ActionCtx } from "../../_generated/server"
import type { PricingCatalog } from "../../queries/billing/catalog"
import type { UserBillingContext } from "../../queries/billing/internal"
import { getConvexEnv } from "../../../src/env"
import {
  reconcileBillingCustomer,
  reconcileStripeSubscription,
  syncBillingInvoicesForCustomer,
  syncBillingPaymentMethodsForCustomer,
  type BillingLifecycleOps,
} from "../../../src/lib/billingLifecycle"
import {
  hasManagedCreatorGrantSubscriptionAccess,
} from "../../../src/lib/billing"
import { hasCreatorAccess } from "../../../src/lib/billingAccess"
import {
  getExpandedStripeInvoice,
} from "../../../src/lib/stripe/billing"
import {
  getClerkBackendClient,
  syncClerkCreatorAttributionMetadata,
} from "../../../src/lib/clerk"
import { getStripe, STRIPE_CATALOG_APP } from "../../../src/lib/stripe/client"
import {
  buildCheckoutCancelUrl,
  buildCheckoutSuccessUrl,
  createHostedSubscriptionCheckoutSession,
  shouldBlockNewCheckout,
} from "../../lib/stripe/helpers/checkout"
import {
  BillingActionError,
  sanitizeBillingError,
} from "../../lib/stripe/helpers/errors"
import {
  createGbpEstimateFxQuote,
  estimateFromGbpMinorUnits,
} from "../../lib/stripe/helpers/fxQuotes"
import { createStripeBillingPortalSession } from "../../lib/stripe/helpers/portal"

type BillingPlanRecord = {
  active: boolean
  archivedAt?: number
  currency: string
  description: string
  key: string
  monthlyPriceAmount: number
  monthlyPriceAmountCad?: number
  monthlyPriceAmountEur?: number
  monthlyPriceAmountUsd?: number
  monthlyPriceId?: string
  monthlyPriceIdCad?: string
  monthlyPriceIdEur?: string
  monthlyPriceIdUsd?: string
  name: string
  planType: "free" | "paid"
  sortOrder: number
  stripeProductId?: string
  yearlyPriceAmount: number
  yearlyPriceAmountCad?: number
  yearlyPriceAmountEur?: number
  yearlyPriceAmountUsd?: number
  yearlyPriceId?: string
  yearlyPriceIdCad?: string
  yearlyPriceIdEur?: string
  yearlyPriceIdUsd?: string
}
type BillingSubscriptionRecord = {
  cancelAtPeriodEnd: boolean
  currentPeriodEnd?: number
  interval: "month" | "year"
  managedGrantEndsAt?: number
  planKey: string
  status:
    | "active"
    | "canceled"
    | "incomplete"
    | "incomplete_expired"
    | "past_due"
    | "paused"
    | "trialing"
    | "unpaid"
  stripeCustomerId: string
  stripeSubscriptionId: string
  stripeSubscriptionItemId?: string
}
type CreatorAccountRecord = {
  _id: string
  code: string
  codeActive: boolean
  discountPercent: number
  userId: string
}
type CreatorAttributionRecord = {
  creatorAccountId: string
  creatorCode: string
  normalizedCode: string
  source: "cookie" | "manual" | "staff"
}
type CreatorAttributionResult =
  | {
      status: "applied"
    }
  | {
      status: "confirmed_existing"
    }
  | {
      existingCode: string
      status: "conflict_locked"
    }
type CheckoutCreatorDiscount = {
  amount: number
  code: string
  discountPercent: number
  sourceLabel: string
}
type CheckoutCreatorDiscountResult = {
  appliedDiscount: CheckoutCreatorDiscount | null
  entryState: CheckoutCreatorEntryState
  message: string
}
type CheckoutPlanPricingResult = {
  amount: number
  currency: SupportedPricingCurrency
  currencyNotice: string | null
  priceId: string
}
type PurchasablePlanResult = {
  amount: CheckoutPlanPricingResult["amount"]
  currency: CheckoutPlanPricingResult["currency"]
  currencyNotice: CheckoutPlanPricingResult["currencyNotice"]
  plan: BillingPlanRecord
  priceId: CheckoutPlanPricingResult["priceId"]
}
type SubscriptionCheckoutSessionResult = {
  checkoutUrl: string
  creatorCode: string | null
  currency: SupportedPricingCurrency
  currencyNotice: string | null
  interval: "month" | "year"
  planKey: string
  sessionId: string
}
type BillingPortalSessionResult = {
  portalUrl: string
  sessionId: string
}
type CheckoutSessionCompletionSyncResult = {
  paymentStatus: "no_payment_required" | "paid" | "unpaid" | null
  planKey: string | null
  sessionId: string
  status: "complete" | "expired" | "open"
  subscriptionId: string | null
  synced: boolean
}
type PublicActionCtx = ActionCtx
type SupportedPricingCurrency = "GBP" | "USD" | "CAD" | "EUR"
type CheckoutCreatorEntryState =
  | "applied"
  | "eligible_but_not_entered"
  | "not_eligible"
  | "rejected"
type BillingUserContext = UserBillingContext & {
  actorName: string
  email?: string
  metadataStripeCustomerId?: string
}

const billingIntervalValidator = v.union(v.literal("month"), v.literal("year"))
const supportedPricingCurrencyValidator = v.union(
  v.literal("GBP"),
  v.literal("USD"),
  v.literal("CAD"),
  v.literal("EUR")
)
const subscriptionCancellationModeValidator = v.union(
  v.literal("immediately"),
  v.literal("period_end")
)
const billingProfileAddressValidator = v.object({
  city: v.optional(v.string()),
  country: v.optional(v.string()),
  line1: v.optional(v.string()),
  line2: v.optional(v.string()),
  postalCode: v.optional(v.string()),
  state: v.optional(v.string()),
})

function getAppPublicOrigin() {
  const rawOrigin = getConvexEnv().APP_PUBLIC_ORIGIN?.trim()

  if (!rawOrigin) {
    throw new BillingActionError(
      "missing_public_origin",
      "Missing APP_PUBLIC_ORIGIN. Stripe Checkout requires an absolute app origin.",
      500
    )
  }

  try {
    return new URL(rawOrigin).origin
  } catch {
    throw new BillingActionError(
      "invalid_public_origin",
      "Invalid APP_PUBLIC_ORIGIN. Use an absolute URL such as https://codstats.tech.",
      500
    )
  }
}

function getStripeStatusPriority(status: Stripe.Subscription.Status) {
  switch (status) {
    case "active":
      return 7
    case "trialing":
      return 6
    case "past_due":
      return 5
    case "paused":
      return 4
    case "incomplete":
      return 3
    case "unpaid":
      return 2
    case "canceled":
      return 1
    case "incomplete_expired":
      return 0
  }
}

function normalizeOptionalString(value: string | null | undefined) {
  if (typeof value !== "string") {
    return undefined
  }

  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : undefined
}

function getMetadataStripeCustomerId(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined
  }

  const metadata = value as Record<string, unknown>
  const directValue = metadata.stripeCustomerId

  if (
    typeof directValue === "string" &&
    directValue.trim().startsWith("cus_")
  ) {
    return directValue.trim()
  }

  const billingValue = metadata.billing

  if (
    !billingValue ||
    typeof billingValue !== "object" ||
    Array.isArray(billingValue)
  ) {
    return undefined
  }

  const nestedValue = (billingValue as Record<string, unknown>).stripeCustomerId

  if (
    typeof nestedValue === "string" &&
    nestedValue.trim().startsWith("cus_")
  ) {
    return nestedValue.trim()
  }

  return undefined
}

async function requireBillingUser(
  ctx: PublicActionCtx
): Promise<BillingUserContext> {
  const identity = await ctx.auth.getUserIdentity()

  if (!identity) {
    throw new BillingActionError(
      "unauthenticated",
      "You must be signed in to manage billing.",
      401
    )
  }

  const billingContext: UserBillingContext | null = await ctx.runQuery(
    internal.queries.billing.internal.getUserBillingContextByClerkUserId,
    {
      clerkUserId: identity.subject,
    }
  )

  if (!billingContext) {
    throw new BillingActionError(
      "missing_user",
      "Your billing account could not be found.",
      404
    )
  }

  const clerkUser = await getClerkBackendClient().users.getUser(
    identity.subject
  )
  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses?.[0]?.emailAddress ??
    billingContext.customer?.email ??
    undefined
  const actorName =
    [clerkUser.firstName?.trim(), clerkUser.lastName?.trim()]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    clerkUser.username?.trim() ||
    billingContext.user.name

  return {
    ...billingContext,
    actorName,
    email,
    metadataStripeCustomerId: getMetadataStripeCustomerId(
      clerkUser.publicMetadata
    ),
  }
}

async function assertCheckoutEnabled(ctx: PublicActionCtx) {
  const checkoutFlag = await ctx.runQuery(
    internal.queries.featureFlags.internal.getByKey,
    {
      key: "checkout",
    }
  )

  if (checkoutFlag && !checkoutFlag.enabled) {
    throw new BillingActionError(
      "checkout_disabled",
      "Checkout is currently unavailable.",
      403
    )
  }
}

function hasActiveCreatorGrant(
  userContext: BillingUserContext
) {
  return (
    hasCreatorAccess({
      effectivePlanKey: userContext.accessGrant?.planKey,
      grantSource: userContext.accessGrant?.source,
    }) ||
    (userContext.subscription !== null &&
      hasManagedCreatorGrantSubscriptionAccess(userContext.subscription))
  )
}

function getCreatorGrantAccessWindow(
  userContext: BillingUserContext
) {
  if (userContext.subscription?.managedGrantEndsAt) {
    return ` until ${new Date(userContext.subscription.managedGrantEndsAt).toISOString()}`
  }

  if (userContext.accessGrant?.endsAt) {
    return ` until ${new Date(userContext.accessGrant.endsAt).toISOString()}`
  }

  return ""
}

function assertCreatorGrantAllowsSelfServeBilling(args: {
  action: "cancellation" | "checkout" | "plan_change" | "reactivation"
  userContext: BillingUserContext
}) {
  if (!hasActiveCreatorGrant(args.userContext)) {
    return
  }

  const accessWindow = getCreatorGrantAccessWindow(args.userContext)
  const actionLabel =
    args.action === "checkout"
      ? "Checkout"
      : args.action === "plan_change"
        ? "Plan changes"
        : args.action === "reactivation"
          ? "Subscription reactivation"
          : "Subscription cancellation"

  throw new BillingActionError(
    "creator_grant_locked",
    `${actionLabel} is unavailable while complimentary Creator access is active${accessWindow}.`,
    409
  )
}

async function recordBillingAuditLog(args: {
  action: string
  ctx: PublicActionCtx
  details?: string
  entityId: string
  entityLabel?: string
  result: "error" | "success" | "warning"
  summary: string
  user: BillingUserContext["user"]
  userName: string
}) {
  await args.ctx.runMutation(internal.mutations.staff.internal.insertAuditLog, {
    action: args.action,
    actorClerkUserId: args.user.clerkUserId,
    actorName: args.userName,
    actorRole: args.user.role ?? "user",
    details: args.details,
    entityId: args.entityId,
    entityLabel: args.entityLabel,
    entityType: "billingCustomerAction",
    result: args.result,
    summary: args.summary,
  })
}

async function getPurchasablePlan(args: {
  ctx: PublicActionCtx
  interval: "month" | "year"
  planKey: string
  preferredCurrency?: SupportedPricingCurrency
}): Promise<PurchasablePlanResult> {
  const plan: BillingPlanRecord | null = await args.ctx.runQuery(
    internal.queries.billing.internal.getPlanByKey,
    {
      planKey: args.planKey,
    }
  )

  if (!plan || !plan.active || plan.archivedAt !== undefined) {
    throw new BillingActionError(
      "plan_unavailable",
      "That plan is not available for purchase.",
      404
    )
  }

  if (plan.planType !== "paid") {
    throw new BillingActionError(
      "plan_not_paid",
      "That plan cannot be purchased through Stripe.",
      400
    )
  }

  return {
    ...resolveCheckoutPlanPricing({
      interval: args.interval,
      plan,
      preferredCurrency: args.preferredCurrency,
    }),
    plan,
  }
}

function getPlanAmount(plan: BillingPlanRecord, interval: "month" | "year") {
  return interval === "month" ? plan.monthlyPriceAmount : plan.yearlyPriceAmount
}

function getCheckoutPlanPriceId(args: {
  interval: "month" | "year"
  plan: BillingPlanRecord
}) {
  return args.interval === "month"
    ? args.plan.monthlyPriceId
    : args.plan.yearlyPriceId
}

function resolveCheckoutPlanPricing(args: {
  interval: "month" | "year"
  plan: BillingPlanRecord
  preferredCurrency?: SupportedPricingCurrency
}): CheckoutPlanPricingResult {
  const gbpPriceId =
    args.interval === "month"
      ? args.plan.monthlyPriceId
      : args.plan.yearlyPriceId

  if (!gbpPriceId) {
    throw new BillingActionError(
      "missing_price",
      "That plan is missing Stripe pricing for the selected billing interval.",
      409
    )
  }

  return {
    amount: getPlanAmount(args.plan, args.interval),
    currency: "GBP" as const,
    currencyNotice:
      args.preferredCurrency && args.preferredCurrency !== "GBP"
        ? "Stripe Checkout confirms final currency, taxes, discounts, and total. The app never uses estimate currency to choose the Stripe Price."
        : null,
    priceId: gbpPriceId,
  }
}

async function getLiveStripePriceSnapshot<TInterval extends "month" | "year">(args: {
  fallbackPricing: {
    amount: number
    currency: string
    interval: TInterval
  } | null
  interval: TInterval
  plan: BillingPlanRecord | null
  priceCache: Map<string, Promise<Stripe.Price | null>>
  stripe: Stripe
}): Promise<{
  amount: number
  currency: string
  interval: TInterval
} | null> {
  if (!args.fallbackPricing || !args.plan) {
    return args.fallbackPricing
  }

  const candidatePriceIds = [
    getCheckoutPlanPriceId({
      interval: args.interval,
      plan: args.plan,
    }),
  ].filter((value): value is string => Boolean(value))

  for (const priceId of candidatePriceIds) {
    let pricePromise = args.priceCache.get(priceId)

    if (!pricePromise) {
      pricePromise = args.stripe.prices.retrieve(priceId).catch(() => null)
      args.priceCache.set(priceId, pricePromise)
    }

    const price = await pricePromise

    if (!price || "deleted" in price || typeof price.unit_amount !== "number") {
      continue
    }

    return {
      amount: price.unit_amount,
      currency: price.currency.toUpperCase(),
      interval: args.interval,
    }
  }

  return args.fallbackPricing
}

function getEstimatedPricingSnapshot<TInterval extends "month" | "year">(args: {
  estimateCurrency: SupportedPricingCurrency
  fxRate: number | null
  pricing: {
    amount: number
    currency: string
    interval: TInterval
  } | null
}) {
  if (!args.pricing || args.estimateCurrency === "GBP" || !args.fxRate) {
    return args.pricing
  }

  return {
    amount: estimateFromGbpMinorUnits({
      amount: args.pricing.amount,
      rate: args.fxRate,
    }),
    currency: args.estimateCurrency,
    interval: args.pricing.interval,
  }
}

async function buildStripeEstimatedPricingCatalog(args: {
  baseCatalog: PricingCatalog
  ctx: PublicActionCtx
  estimateCurrency: SupportedPricingCurrency
}): Promise<PricingCatalog> {
  const stripe = getStripe()
  const priceCache = new Map<string, Promise<Stripe.Price | null>>()
  const fxQuote =
    args.estimateCurrency === "GBP"
      ? null
      : await createGbpEstimateFxQuote({
          estimateCurrency: args.estimateCurrency,
        }).catch(() => null)
  const displayedCurrency =
    args.estimateCurrency === "GBP" || fxQuote
      ? args.estimateCurrency
      : ("GBP" as const)
  const paidPlanKeys = args.baseCatalog.plans
    .filter((plan) => plan.planType === "paid")
    .map((plan) => plan.planKey)
  const planRecords: Array<BillingPlanRecord | null> = await Promise.all(
    paidPlanKeys.map((planKey) =>
      args.ctx.runQuery(internal.queries.billing.internal.getPlanByKey, {
        planKey,
      })
    )
  )
  const plansByKey = new Map(
    planRecords
      .filter((plan): plan is BillingPlanRecord => Boolean(plan))
      .map((plan) => [plan.key, plan] as const)
  )
  const fxRate = displayedCurrency === "GBP" ? null : (fxQuote?.rate ?? null)

  return {
    ...args.baseCatalog,
    plans: await Promise.all(
      args.baseCatalog.plans.map(async (plan) => {
        const planRecord = plansByKey.get(plan.planKey) ?? null

        return {
          ...plan,
          pricing: {
            month: await getEstimatedPricingSnapshot({
              estimateCurrency: displayedCurrency,
              fxRate,
              pricing: await getLiveStripePriceSnapshot({
                fallbackPricing: plan.pricing.month,
                interval: "month",
                plan: planRecord,
                priceCache,
                stripe,
              }),
            }),
            year: await getEstimatedPricingSnapshot({
              estimateCurrency: displayedCurrency,
              fxRate,
              pricing: await getLiveStripePriceSnapshot({
                fallbackPricing: plan.pricing.year,
                interval: "year",
                plan: planRecord,
                priceCache,
                stripe,
              }),
            }),
          },
        }
      })
    ),
    currencyNotice:
      args.estimateCurrency === "GBP"
        ? "Plans are billed from the GBP catalog. Stripe Checkout confirms final currency, taxes, discounts, and total."
        : fxQuote
          ? `Showing approximate ${args.estimateCurrency} estimates from Stripe FX Quotes. Final currency, taxes, discounts, and total are confirmed by Stripe Checkout, and exchange rates may shift.`
          : `Stripe ${args.estimateCurrency} estimates are unavailable right now, so prices are shown in GBP. Final currency, taxes, discounts, and total are confirmed by Stripe Checkout, and exchange rates may shift.`,
    selectedCurrency: displayedCurrency,
  }
}

function normalizeCreatorCodeInput(value: string | undefined) {
  if (!value) {
    return undefined
  }

  const normalizedCode = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
  return /^[A-Z0-9]{3,24}$/.test(normalizedCode) ? normalizedCode : undefined
}

function getCreatorDiscountAmount(args: {
  amount: number
  discountPercent: number | null
}) {
  if (!args.discountPercent || args.discountPercent <= 0) {
    return 0
  }

  return Math.max(0, Math.round((args.amount * args.discountPercent) / 100))
}

function getCreatorSourceLabel(source: "cookie" | "manual" | "staff") {
  if (source === "manual") {
    return "Applied from code entry"
  }

  if (source === "staff") {
    return "Applied by support"
  }

  return "Applied from creator link"
}

async function ensureCreatorDiscountCoupon(args: {
  creatorCode: string
  discountPercent: number
  stripe: Stripe
}) {
  const couponId = [
    "creator",
    "once",
    args.creatorCode.toLowerCase(),
    String(args.discountPercent),
  ].join("_")

  try {
    const existingCoupon = await args.stripe.coupons.retrieve(couponId)

    if (!existingCoupon.deleted) {
      return existingCoupon.id
    }
  } catch (error) {
    if (
      !(
        error instanceof Stripe.errors.StripeInvalidRequestError &&
        error.code === "resource_missing"
      )
    ) {
      throw error
    }
  }

  const createdCoupon = await args.stripe.coupons.create({
    duration: "once",
    id: couponId,
    metadata: {
      app: STRIPE_CATALOG_APP,
      creatorCode: args.creatorCode,
      kind: "creator_discount",
    },
    name: `${args.creatorCode} first payment discount`,
    percent_off: args.discountPercent,
  })

  return createdCoupon.id
}

async function finalizeCreatorAttribution(args: {
  creatorAccount: CreatorAccountRecord
  ctx: PublicActionCtx
  normalizedCode: string
  userContext: BillingUserContext
}) {
  const attributionResult: CreatorAttributionResult = await args.ctx.runMutation(
    internal.mutations.creator.attribution.ensureCanonicalAttribution,
    {
      clerkUserId: args.userContext.user.clerkUserId,
      creatorAccountId: args.creatorAccount._id as Id<"creatorAccounts">,
      creatorCode: args.creatorAccount.code,
      normalizedCode: args.normalizedCode,
      source: "manual",
      userId: args.userContext.user._id,
    }
  )

  if (attributionResult.status === "applied") {
    const clerkUser = await getClerkBackendClient().users.getUser(
      args.userContext.user.clerkUserId
    )

    await syncClerkCreatorAttributionMetadata({
      clerkUserId: args.userContext.user.clerkUserId,
      code: args.creatorAccount.code,
      currentPublicMetadata: clerkUser.publicMetadata,
      source: "manual",
    })
  }

  return attributionResult
}

async function resolveCheckoutCreatorDiscount(args: {
  amount: number
  creatorCode?: string
  ctx: PublicActionCtx
  finalizeCodeEntry?: boolean
  userContext: BillingUserContext
}): Promise<CheckoutCreatorDiscountResult> {
  const activeAttribution: CreatorAttributionRecord | null =
    await args.ctx.runQuery(
    internal.queries.creator.internal.getActiveAttributionByUserId,
    {
      userId: args.userContext.user._id,
    }
  )
  const normalizedEnteredCode = normalizeCreatorCodeInput(args.creatorCode)

  if (activeAttribution) {
    const creatorAccount: CreatorAccountRecord | null = await args.ctx.runQuery(
      internal.queries.creator.internal.getCreatorAccountById,
      {
        creatorAccountId:
          activeAttribution.creatorAccountId as Id<"creatorAccounts">,
      }
    )
    const hasActiveDiscount =
      creatorAccount &&
      creatorAccount.codeActive &&
      creatorAccount.discountPercent > 0 &&
      creatorAccount.userId !== args.userContext.user._id

    const appliedDiscount = hasActiveDiscount
      ? {
          amount: getCreatorDiscountAmount({
            amount: args.amount,
            discountPercent: creatorAccount.discountPercent,
          }),
          code: creatorAccount.code,
          discountPercent: creatorAccount.discountPercent,
          sourceLabel: getCreatorSourceLabel(activeAttribution.source),
        }
      : null

    if (
      normalizedEnteredCode &&
      normalizedEnteredCode !== activeAttribution.normalizedCode
    ) {
      return {
        appliedDiscount,
        entryState: "rejected" as CheckoutCreatorEntryState,
        message: `This account is already linked to ${activeAttribution.creatorCode}.`,
      }
    }

    if (appliedDiscount) {
      return {
        appliedDiscount,
        entryState: "applied" as CheckoutCreatorEntryState,
        message:
          activeAttribution.source === "manual"
            ? "Already linked to your account."
            : "Applied from creator link.",
      }
    }

    return {
      appliedDiscount: null,
      entryState: "not_eligible" as CheckoutCreatorEntryState,
      message:
        "Your linked creator code is no longer eligible for a first payment discount.",
    }
  }

  if (!normalizedEnteredCode) {
    return {
      appliedDiscount: null,
      entryState: "eligible_but_not_entered" as CheckoutCreatorEntryState,
      message: "Have a creator code? Enter it before payment to apply it.",
    }
  }

  const creatorAccount: CreatorAccountRecord | null = await args.ctx.runQuery(
    internal.queries.creator.internal.getCreatorAccountByNormalizedCode,
    {
      normalizedCode: normalizedEnteredCode,
    }
  )

  if (!creatorAccount || !creatorAccount.codeActive) {
    return {
      appliedDiscount: null,
      entryState: "rejected" as CheckoutCreatorEntryState,
      message: "This creator code isn't available right now.",
    }
  }

  if (creatorAccount.userId === args.userContext.user._id) {
    return {
      appliedDiscount: null,
      entryState: "rejected" as CheckoutCreatorEntryState,
      message: "You can't apply your own creator code to this account.",
    }
  }

  if (args.finalizeCodeEntry) {
    await finalizeCreatorAttribution({
      creatorAccount,
      ctx: args.ctx,
      normalizedCode: normalizedEnteredCode,
      userContext: args.userContext,
    })
  }

  return {
    appliedDiscount: {
      amount: getCreatorDiscountAmount({
        amount: args.amount,
        discountPercent: creatorAccount.discountPercent,
      }),
      code: creatorAccount.code,
      discountPercent: creatorAccount.discountPercent,
      sourceLabel: "Applied from code entry",
    },
    entryState: "applied" as CheckoutCreatorEntryState,
    message: "Applied from code entry.",
  }
}

async function ensureStripeCustomer(args: {
  ctx: PublicActionCtx
  email?: string
  stripe: Stripe
  userContext: BillingUserContext
}) {
  if (args.userContext.customer?.stripeCustomerId) {
    await args.ctx.runMutation(
      internal.mutations.billing.state.upsertBillingCustomer,
      {
        active: true,
        clerkUserId: args.userContext.user.clerkUserId,
        email: args.email ?? args.userContext.customer.email,
        name: args.userContext.actorName,
        stripeCustomerId: args.userContext.customer.stripeCustomerId,
        userId: args.userContext.user._id,
      }
    )

    return args.userContext.customer.stripeCustomerId
  }

  if (args.userContext.metadataStripeCustomerId) {
    try {
      const existingCustomer = await args.stripe.customers.retrieve(
        args.userContext.metadataStripeCustomerId
      )

      if (!existingCustomer.deleted) {
        await args.ctx.runMutation(
          internal.mutations.billing.state.upsertBillingCustomer,
          {
            active: true,
            clerkUserId: args.userContext.user.clerkUserId,
            email:
              args.email ??
              existingCustomer.email ??
              args.userContext.customer?.email,
            name: existingCustomer.name ?? args.userContext.actorName,
            stripeCustomerId: existingCustomer.id,
            userId: args.userContext.user._id,
          }
        )

        return existingCustomer.id
      }
    } catch (error) {
      if (
        !(
          error instanceof Stripe.errors.StripeInvalidRequestError &&
          error.code === "resource_missing"
        )
      ) {
        throw error
      }
    }
  }

  const customer = await args.stripe.customers.create({
    email: args.email,
    metadata: {
      app: STRIPE_CATALOG_APP,
      clerkUserId: args.userContext.user.clerkUserId,
      userId: args.userContext.user._id,
    },
    name: args.userContext.actorName,
  })

  await args.ctx.runMutation(
    internal.mutations.billing.state.upsertBillingCustomer,
    {
      active: true,
      clerkUserId: args.userContext.user.clerkUserId,
      email: args.email,
      name: args.userContext.actorName,
      stripeCustomerId: customer.id,
      userId: args.userContext.user._id,
    }
  )

  return customer.id
}

async function syncCustomerBillingSnapshot(args: {
  ctx: PublicActionCtx
  stripe: Stripe
  stripeCustomerId: string
  syncInvoices?: boolean
}) {
  await reconcileBillingCustomer({
    active: true,
    ctx: createBillingLifecycleOps(args.ctx),
    stripe: args.stripe,
    stripeCustomerId: args.stripeCustomerId,
  })
  await syncBillingPaymentMethodsForCustomer({
    ctx: createBillingLifecycleOps(args.ctx),
    stripe: args.stripe,
    stripeCustomerId: args.stripeCustomerId,
  })

  if (args.syncInvoices ?? true) {
    await syncBillingInvoicesForCustomer({
      ctx: createBillingLifecycleOps(args.ctx),
      stripe: args.stripe,
      stripeCustomerId: args.stripeCustomerId,
    })
  }
}

async function getExistingStripeSubscription(args: {
  customerId: string
  stripe: Stripe
}) {
  const subscriptions = await args.stripe.subscriptions.list({
    customer: args.customerId,
    limit: 10,
    status: "all",
  })

  return (
    [...subscriptions.data]
      .filter((subscription) => shouldBlockNewCheckout(subscription))
      .sort((left, right) => {
        const priorityDifference =
          getStripeStatusPriority(right.status) -
          getStripeStatusPriority(left.status)

        if (priorityDifference !== 0) {
          return priorityDifference
        }

        return right.created - left.created
      })[0] ?? null
  )
}

async function listStripeSubscriptionsForCustomer(args: {
  customerId: string
  stripe: Stripe
}) {
  const subscriptions: Stripe.Subscription[] = []

  for await (const subscription of args.stripe.subscriptions.list({
    customer: args.customerId,
    expand: ["data.default_payment_method"],
    limit: 100,
    status: "all",
  })) {
    subscriptions.push(subscription)
  }

  return subscriptions
}

async function getExpandedSubscription(args: {
  stripe: Stripe
  subscriptionId: string
}) {
  return await args.stripe.subscriptions.retrieve(args.subscriptionId, {
    expand: [
      "customer",
      "default_payment_method",
      "items.data.price.product",
      "latest_invoice.confirmation_secret",
      "latest_invoice.payment_intent",
      "pending_setup_intent",
      "schedule",
    ],
  })
}

async function voidOrDeleteInvoiceIfPending(args: {
  invoice: string | Stripe.Invoice | null | undefined
  stripe: Stripe
}) {
  const expandedInvoice = getExpandedStripeInvoice(args.invoice)
  const invoiceId =
    expandedInvoice?.id ??
    (typeof args.invoice === "string" ? args.invoice : undefined)

  if (!invoiceId) {
    return false
  }

  const invoice =
    expandedInvoice ?? (await args.stripe.invoices.retrieve(invoiceId))

  if (invoice.status === "draft") {
    await args.stripe.invoices.del(invoice.id)
    return true
  }

  if (invoice.status === "open") {
    await args.stripe.invoices.voidInvoice(invoice.id)
    return true
  }

  return false
}

async function clearPendingInvoicesForSubscription(args: {
  stripe: Stripe
  subscriptionId: string
}) {
  let invoiceWasCleared = false
  const invoices = await args.stripe.invoices.list({
    limit: 12,
    subscription: args.subscriptionId,
  })

  for (const invoice of invoices.data) {
    if (invoice.status === "draft") {
      await args.stripe.invoices.del(invoice.id)
      invoiceWasCleared = true
      continue
    }

    if (invoice.status === "open") {
      await args.stripe.invoices.voidInvoice(invoice.id)
      invoiceWasCleared = true
    }
  }

  return invoiceWasCleared
}

async function cancelIncompleteSubscription(args: {
  ctx: PublicActionCtx
  reason: "checkout_abandoned" | "replaced_before_confirmation"
  stripe: Stripe
  subscription: Stripe.Subscription
  userContext: BillingUserContext
}) {
  const cancelledSubscription = await args.stripe.subscriptions.cancel(
    args.subscription.id,
    {
      invoice_now: false,
      prorate: false,
    }
  )
  const expandedCancelledSubscription = await getExpandedSubscription({
    stripe: args.stripe,
    subscriptionId: cancelledSubscription.id,
  })
  const latestInvoiceWasCleared = await voidOrDeleteInvoiceIfPending({
    invoice: expandedCancelledSubscription.latest_invoice,
    stripe: args.stripe,
  })
  const relatedInvoicesWereCleared = await clearPendingInvoicesForSubscription({
    stripe: args.stripe,
    subscriptionId: expandedCancelledSubscription.id,
  })
  const invoiceWasCleared =
    latestInvoiceWasCleared || relatedInvoicesWereCleared

  await reconcileStripeSubscription({
    ctx: createBillingLifecycleOps(args.ctx),
    stripe: args.stripe,
    subscription: expandedCancelledSubscription,
  })

  await recordBillingAuditLog({
    action: "billing.checkout.abandoned",
    ctx: args.ctx,
    details: JSON.stringify(
      {
        invoiceWasCleared,
        reason: args.reason,
        stripeSubscriptionId: expandedCancelledSubscription.id,
      },
      null,
      2
    ),
    entityId: expandedCancelledSubscription.id,
    entityLabel: expandedCancelledSubscription.metadata.planKey ?? undefined,
    result: "warning",
    summary:
      args.reason === "checkout_abandoned"
        ? "Abandoned checkout before payment confirmation."
        : "Replaced an incomplete checkout with a new selection before confirmation.",
    user: args.userContext.user,
    userName: args.userContext.actorName,
  })

  return {
    invoiceWasCleared,
    subscription: expandedCancelledSubscription,
  }
}

function createBillingLifecycleOps(
  ctx: Pick<ActionCtx, "runMutation" | "runQuery">
): BillingLifecycleOps {
  return {
    getBillingContextByStripeCustomerId: (args) =>
      ctx.runQuery(
        internal.queries.billing.internal.getBillingContextByStripeCustomerId,
        args
      ),
    getBillingPlans: (args) =>
      ctx.runQuery(internal.queries.billing.catalog.getBillingPlans, args),
    getPlanByStripePriceId: (args) =>
      ctx.runQuery(
        internal.queries.billing.internal.getPlanByStripePriceId,
        args
      ),
    syncBillingInvoices: (args) =>
      ctx.runMutation(internal.mutations.billing.state.syncBillingInvoices, {
        ...args,
        userId: args.userId as Id<"users">,
      }),
    syncBillingPaymentMethods: (args) =>
      ctx.runMutation(
        internal.mutations.billing.state.syncBillingPaymentMethods,
        {
          ...args,
          userId: args.userId as Id<"users">,
        }
      ),
    upsertBillingCustomer: (args) =>
      ctx.runMutation(internal.mutations.billing.state.upsertBillingCustomer, {
        ...args,
        userId: args.userId as Id<"users">,
      }),
    upsertBillingSubscription: (args) =>
      ctx.runMutation(
        internal.mutations.billing.state.upsertBillingSubscription,
        {
          ...args,
          userId: args.userId as Id<"users">,
        }
      ),
  }
}

function throwManagedInCustomerPortal(): never {
  throw new BillingActionError(
    "managed_in_stripe_customer_portal",
    "This billing operation is managed in Stripe Customer Portal.",
    409
  )
}

export const syncBillingCenter = action({
  args: {},
  handler: async (ctx) => {
    try {
      const userContext = await requireBillingUser(ctx)
      const stripe = getStripe()
      const customerId =
        userContext.customer?.stripeCustomerId ??
        (userContext.metadataStripeCustomerId
          ? await ensureStripeCustomer({
              ctx,
              email: userContext.email,
              stripe,
              userContext,
            })
          : undefined)

      if (!customerId) {
        return {
          hasCustomer: false,
          syncedAt: Date.now(),
        }
      }

      await syncCustomerBillingSnapshot({
        ctx,
        stripe,
        stripeCustomerId: customerId,
        syncInvoices: false,
      })

      const subscriptions = await listStripeSubscriptionsForCustomer({
        customerId,
        stripe,
      })

      for (const subscription of subscriptions) {
        const expandedSubscription = await getExpandedSubscription({
          stripe,
          subscriptionId: subscription.id,
        })

        await reconcileStripeSubscription({
          ctx: createBillingLifecycleOps(ctx),
          stripe,
          subscription: expandedSubscription,
        })
      }
      await ctx.runMutation(
        internal.mutations.billing.state
          .deleteBillingSubscriptionsMissingFromSync,
        {
          stripeCustomerId: customerId,
          stripeSubscriptionIds: subscriptions.map(
            (subscription) => subscription.id
          ),
          userId: userContext.user._id,
        }
      )

      await syncBillingInvoicesForCustomer({
        ctx: createBillingLifecycleOps(ctx),
        stripe,
        stripeCustomerId: customerId,
      })

      return {
        hasCustomer: true,
        syncedAt: Date.now(),
      }
    } catch (error) {
      throw sanitizeBillingError(error)
    }
  },
})

export const createBillingPortalSession = action({
  args: {},
  handler: async (ctx): Promise<BillingPortalSessionResult> => {
    try {
      const userContext = await requireBillingUser(ctx)
      const stripe = getStripe()
      const appOrigin = getAppPublicOrigin()
      const customerId = await ensureStripeCustomer({
        ctx,
        email: userContext.email,
        stripe,
        userContext,
      })

      await syncCustomerBillingSnapshot({
        ctx,
        stripe,
        stripeCustomerId: customerId,
        syncInvoices: false,
      })

      const session = await createStripeBillingPortalSession({
        customerId,
        returnUrl: `${appOrigin}/settings/billing`,
        stripe,
      })

      await recordBillingAuditLog({
        action: "billing.portal.session_started",
        ctx,
        entityId: session.id,
        entityLabel: customerId,
        result: "success",
        summary: "Started Stripe Customer Portal session.",
        user: userContext.user,
        userName: userContext.actorName,
      })

      return {
        portalUrl: session.url,
        sessionId: session.id,
      }
    } catch (error) {
      throw sanitizeBillingError(error)
    }
  },
})

export const updateBillingProfile = action({
  args: {
    address: v.optional(billingProfileAddressValidator),
    businessName: v.optional(v.string()),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (): Promise<never> => {
    try {
      throwManagedInCustomerPortal()
    } catch (error) {
      throw sanitizeBillingError(error)
    }
  },
})

export const createPaymentMethodSetupIntent = action({
  args: {},
  handler: async (): Promise<never> => {
    try {
      throwManagedInCustomerPortal()
    } catch (error) {
      throw sanitizeBillingError(error)
    }
  },
})

export const setDefaultPaymentMethod = action({
  args: {
    paymentMethodId: v.string(),
  },
  handler: async (): Promise<never> => {
    try {
      throwManagedInCustomerPortal()
    } catch (error) {
      throw sanitizeBillingError(error)
    }
  },
})

export const removePaymentMethod = action({
  args: {
    paymentMethodId: v.string(),
  },
  handler: async (): Promise<never> => {
    try {
      throwManagedInCustomerPortal()
    } catch (error) {
      throw sanitizeBillingError(error)
    }
  },
})
export const createSubscriptionCheckoutSession = action({
  args: {
    creatorCode: v.optional(v.string()),
    interval: billingIntervalValidator,
    planKey: v.string(),
    preferredCurrency: v.optional(supportedPricingCurrencyValidator),
  },
  handler: async (ctx, args): Promise<SubscriptionCheckoutSessionResult> => {
    try {
      await assertCheckoutEnabled(ctx)

      const userContext = await requireBillingUser(ctx)
      assertCreatorGrantAllowsSelfServeBilling({
        action: "checkout",
        userContext,
      })

      const stripe = getStripe()
      const appOrigin = getAppPublicOrigin()
      const { amount, currency, currencyNotice, plan, priceId } =
        await getPurchasablePlan({
          ctx,
          interval: args.interval,
          planKey: args.planKey,
          preferredCurrency: args.preferredCurrency,
        })
      const creatorDiscount = await resolveCheckoutCreatorDiscount({
        amount,
        creatorCode: args.creatorCode,
        ctx,
        finalizeCodeEntry: true,
        userContext,
      })
      const customerId = await ensureStripeCustomer({
        ctx,
        email: userContext.email,
        stripe,
        userContext,
      })
      const existingSubscription = await getExistingStripeSubscription({
        customerId,
        stripe,
      })

      if (existingSubscription) {
        const expandedSubscription = await getExpandedSubscription({
          stripe,
          subscriptionId: existingSubscription.id,
        })
        const subscriptionStillBlocksCheckout =
          shouldBlockNewCheckout(expandedSubscription)

        if (!subscriptionStillBlocksCheckout) {
          await reconcileStripeSubscription({
            ctx: createBillingLifecycleOps(ctx),
            stripe,
            subscription: expandedSubscription,
          })
          await syncCustomerBillingSnapshot({
            ctx,
            stripe,
            stripeCustomerId: customerId,
          })
        } else if (expandedSubscription.status === "incomplete") {
          await cancelIncompleteSubscription({
            ctx,
            reason: "replaced_before_confirmation",
            stripe,
            subscription: expandedSubscription,
            userContext,
          })
          await syncCustomerBillingSnapshot({
            ctx,
            stripe,
            stripeCustomerId: customerId,
          })
        } else {
          throw new BillingActionError(
            "existing_subscription",
            "You already have an active subscription on file. Manage it from billing settings.",
            409
          )
        }
      }

      const discountCouponId = creatorDiscount.appliedDiscount?.discountPercent
        ? await ensureCreatorDiscountCoupon({
            creatorCode: creatorDiscount.appliedDiscount.code,
            discountPercent: creatorDiscount.appliedDiscount.discountPercent,
            stripe,
          })
        : undefined

      const metadata = {
        app: STRIPE_CATALOG_APP,
        billingInterval: args.interval,
        clerkUserId: userContext.user.clerkUserId,
        creatorCode: creatorDiscount.appliedDiscount?.code ?? "",
        creatorDiscountPercent:
          creatorDiscount.appliedDiscount?.discountPercent?.toString() ?? "",
        planKey: plan.key,
        pricingCurrency: currency,
        userId: userContext.user._id,
      }
      const session = await createHostedSubscriptionCheckoutSession({
        cancelUrl: buildCheckoutCancelUrl(appOrigin),
        customerId,
        discountCouponId,
        idempotencyKey: [
            "billing",
            "checkout-session",
            userContext.user._id,
            plan.key,
            args.interval,
            creatorDiscount.appliedDiscount?.code ?? "no-code",
            currency,
          ].join(":"),
        lineItemPriceId: priceId,
        metadata,
        stripe,
        successUrl: buildCheckoutSuccessUrl(appOrigin),
        userId: userContext.user._id,
      })

      if (!session.url) {
        throw new BillingActionError(
          "missing_checkout_url",
          "Stripe did not return a hosted Checkout URL.",
          502
        )
      }

      await recordBillingAuditLog({
        action: "billing.checkout.session_started",
        ctx,
        details: JSON.stringify(
          {
            creatorCode: creatorDiscount.appliedDiscount?.code ?? null,
            currency,
            interval: args.interval,
            planKey: plan.key,
            stripeCheckoutSessionId: session.id,
          },
          null,
          2
        ),
        entityId: session.id,
        entityLabel: plan.name,
        result: "success",
        summary: `Started Checkout Session for ${plan.name} (${args.interval}).`,
        user: userContext.user,
        userName: userContext.actorName,
      })

      return {
        checkoutUrl: session.url,
        creatorCode: creatorDiscount.appliedDiscount?.code ?? null,
        currency,
        currencyNotice,
        interval: args.interval,
        planKey: plan.key,
        sessionId: session.id,
      }
    } catch (error) {
      throw sanitizeBillingError(error)
    }
  },
})

export const getPublicPricingCatalog = action({
  args: {
    preferredCurrency: v.optional(supportedPricingCurrencyValidator),
  },
  handler: async (ctx, args): Promise<PricingCatalog> => {
    try {
      const estimateCurrency = args.preferredCurrency ?? "GBP"
      const baseCatalog: PricingCatalog = await ctx.runQuery(
        internal.queries.billing.catalog.getPublicPricingCatalogInternal,
        {}
      )

      return await buildStripeEstimatedPricingCatalog({
        baseCatalog,
        ctx,
        estimateCurrency,
      })
    } catch (error) {
      throw sanitizeBillingError(error)
    }
  },
})

export const getCustomerPricingCatalog = action({
  args: {
    preferredCurrency: v.optional(supportedPricingCurrencyValidator),
  },
  handler: async (ctx, args): Promise<PricingCatalog> => {
    try {
      const userContext = await requireBillingUser(ctx)
      const estimateCurrency = args.preferredCurrency ?? "GBP"
      const baseCatalog: PricingCatalog = await ctx.runQuery(
        internal.queries.billing.catalog.getCustomerPricingCatalogInternal,
        {
          clerkUserId: userContext.user.clerkUserId,
        }
      )

      return await buildStripeEstimatedPricingCatalog({
        baseCatalog,
        ctx,
        estimateCurrency,
      })
    } catch (error) {
      throw sanitizeBillingError(error)
    }
  },
})

export const syncCheckoutSessionCompletion = action({
  args: {
    sessionId: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<CheckoutSessionCompletionSyncResult> => {
    try {
      const userContext = await requireBillingUser(ctx)
      const stripe = getStripe()
      const session = await stripe.checkout.sessions.retrieve(args.sessionId, {
        expand: ["customer", "subscription"],
      })

      const sessionCustomerId =
        typeof session.customer === "string"
          ? session.customer
          : (session.customer?.id ?? null)
      const sessionSubscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : (session.subscription?.id ?? null)
      const sessionUserId = session.metadata?.userId?.trim()

      if (
        sessionUserId &&
        sessionUserId !== userContext.user._id &&
        sessionCustomerId !== userContext.customer?.stripeCustomerId
      ) {
        throw new BillingActionError(
          "checkout_session_mismatch",
          "That checkout session does not belong to this account.",
          403
        )
      }

      if (
        sessionCustomerId &&
        userContext.customer?.stripeCustomerId &&
        sessionCustomerId !== userContext.customer.stripeCustomerId &&
        sessionUserId !== userContext.user._id
      ) {
        throw new BillingActionError(
          "checkout_session_customer_mismatch",
          "That checkout session does not belong to this customer.",
          403
        )
      }

      if (sessionSubscriptionId) {
        const expandedSubscription = await getExpandedSubscription({
          stripe,
          subscriptionId: sessionSubscriptionId,
        })

        await reconcileStripeSubscription({
          ctx: createBillingLifecycleOps(ctx),
          stripe,
          subscription: expandedSubscription,
        })
      }

      if (sessionCustomerId) {
        await syncCustomerBillingSnapshot({
          ctx,
          stripe,
          stripeCustomerId: sessionCustomerId,
        })
      }

      return {
        paymentStatus: session.payment_status,
        planKey: session.metadata?.planKey ?? null,
        sessionId: session.id,
        status: session.status ?? "open",
        subscriptionId: sessionSubscriptionId,
        synced: Boolean(sessionCustomerId || sessionSubscriptionId),
      }
    } catch (error) {
      throw sanitizeBillingError(error)
    }
  },
})

export const previewCheckoutQuote = action({
  args: {
    creatorCode: v.optional(v.string()),
    interval: billingIntervalValidator,
    planKey: v.string(),
    preferredCurrency: v.optional(supportedPricingCurrencyValidator),
  },
  handler: async (ctx, args) => {
    try {
      await assertCheckoutEnabled(ctx)

      const userContext = await requireBillingUser(ctx)
      assertCreatorGrantAllowsSelfServeBilling({
        action: "checkout",
        userContext,
      })

      const { amount, currency, currencyNotice, plan } =
        await getPurchasablePlan({
          ctx,
          interval: args.interval,
          planKey: args.planKey,
          preferredCurrency: args.preferredCurrency,
        })
      const creatorDiscount = await resolveCheckoutCreatorDiscount({
        amount,
        creatorCode: args.creatorCode,
        ctx,
        userContext,
      })

      return {
        creatorDiscount: {
          amount: creatorDiscount.appliedDiscount?.amount ?? 0,
          appliedCode: creatorDiscount.appliedDiscount?.code ?? null,
          discountPercent:
            creatorDiscount.appliedDiscount?.discountPercent ?? null,
          entryState: creatorDiscount.entryState,
          message: creatorDiscount.message,
          sourceLabel: creatorDiscount.appliedDiscount?.sourceLabel ?? null,
        },
        currency,
        currencyNotice,
        firstPaymentTotal: Math.max(
          amount - (creatorDiscount.appliedDiscount?.amount ?? 0),
          0
        ),
        interval: args.interval,
        planKey: plan.key,
        planName: plan.name,
        planSubtotal: amount,
        renewalTotal: amount,
      }
    } catch (error) {
      throw sanitizeBillingError(error)
    }
  },
})

export const abandonPendingCheckout = action({
  args: {},
  handler: async (ctx) => {
    try {
      const userContext = await requireBillingUser(ctx)
      const customerId =
        userContext.customer?.stripeCustomerId ??
        userContext.metadataStripeCustomerId

      if (!customerId) {
        return {
          abandoned: false,
        }
      }

      const stripe = getStripe()
      const existingSubscription = await getExistingStripeSubscription({
        customerId,
        stripe,
      })

      if (
        !existingSubscription ||
        existingSubscription.status !== "incomplete"
      ) {
        return {
          abandoned: false,
        }
      }

      const expandedSubscription = await getExpandedSubscription({
        stripe,
        subscriptionId: existingSubscription.id,
      })

      if (expandedSubscription.status !== "incomplete") {
        await reconcileStripeSubscription({
          ctx: createBillingLifecycleOps(ctx),
          stripe,
          subscription: expandedSubscription,
        })

        return {
          abandoned: false,
        }
      }

      const result = await cancelIncompleteSubscription({
        ctx,
        reason: "checkout_abandoned",
        stripe,
        subscription: expandedSubscription,
        userContext,
      })
      await syncCustomerBillingSnapshot({
        ctx,
        stripe,
        stripeCustomerId: customerId,
      })

      return {
        abandoned: true,
        invoiceWasCleared: result.invoiceWasCleared,
        status: result.subscription.status,
      }
    } catch (error) {
      throw sanitizeBillingError(error)
    }
  },
})

export const previewSubscriptionChange = action({
  args: {
    interval: billingIntervalValidator,
    planKey: v.string(),
    prorationDate: v.optional(v.number()),
    stripeSubscriptionId: v.optional(v.string()),
  },
  handler: async (): Promise<never> => {
    try {
      throwManagedInCustomerPortal()
    } catch (error) {
      throw sanitizeBillingError(error)
    }
  },
})

export const changeSubscriptionPlan = action({
  args: {
    interval: billingIntervalValidator,
    planKey: v.string(),
    prorationDate: v.optional(v.number()),
    stripeSubscriptionId: v.optional(v.string()),
  },
  handler: async (): Promise<never> => {
    try {
      throwManagedInCustomerPortal()
    } catch (error) {
      throw sanitizeBillingError(error)
    }
  },
})

export const cancelCurrentSubscription = action({
  args: {
    mode: subscriptionCancellationModeValidator,
    stripeSubscriptionId: v.optional(v.string()),
  },
  handler: async (): Promise<never> => {
    try {
      throwManagedInCustomerPortal()
    } catch (error) {
      throw sanitizeBillingError(error)
    }
  },
})

export const reactivateCurrentSubscription = action({
  args: {
    stripeSubscriptionId: v.optional(v.string()),
  },
  handler: async (): Promise<never> => {
    try {
      throwManagedInCustomerPortal()
    } catch (error) {
      throw sanitizeBillingError(error)
    }
  },
})
