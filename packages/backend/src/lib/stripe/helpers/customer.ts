import Stripe from "stripe"

import { internal } from "../../../../convex/_generated/api"
import type { ActionCtx } from "../../../../convex/_generated/server"
import {
  reconcileBillingCustomer,
  reconcileStripeSubscription,
  syncBillingInvoicesForCustomer,
  syncBillingPaymentMethodsForCustomer,
} from "../../billingLifecycle"
import { getClerkBackendClient } from "../../clerk"
import { STRIPE_CATALOG_APP } from "../client"
import { BillingActionError } from "./errors"

type PublicActionCtx = ActionCtx

function getMetadataStripeCustomerId(value: unknown): string | undefined {
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

export async function requireBillingUser(ctx: PublicActionCtx) {
  const identity = await ctx.auth.getUserIdentity()

  if (!identity) {
    throw new BillingActionError(
      "unauthenticated",
      "You must be signed in to manage billing.",
      401
    )
  }

  const billingContext = await ctx.runQuery(
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
    getMetadataStripeCustomerId: getMetadataStripeCustomerId(
      clerkUser.publicMetadata
    ),
  }
}

export type BillingUserContext = Awaited<ReturnType<typeof requireBillingUser>>

export async function ensureStripeCustomer(args: {
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
        clerkUserId: args,
      }
    )
  }
}
