"use node"

import { internal } from "../../_generated/api"
import type { Doc, Id } from "../../_generated/dataModel"
import { action, type ActionCtx } from "../../_generated/server"
import { getConvexEnv } from "../../../src/env"
import {
  createStripeAccountLinkV2,
  createStripeRecipientAccountV2,
  isStripeV2CompatibilityError,
  retrieveStripeAccountV2,
} from "../../../src/lib/stripe/connect"
import {
  buildCreatorCodeSeed,
  DEFAULT_CREATOR_PROGRAM_DEFAULTS,
  hasCreatorWorkspaceAccess,
  mapStripeConnectedAccountV2Snapshot,
  mapStripeConnectedAccountSnapshot,
  normalizeCreatorCode,
  normalizeCreatorCountry,
} from "../../../src/lib/creatorProgram"
import { getClerkBackendClient } from "../../../src/lib/clerk"
import { getStripe } from "../../../src/lib/stripe/client"

const CONNECT_START_PATH = "/creator/connect/start"
const CONNECT_RETURN_PATH = "/creator/connect/return"

function getPrimaryEmail(clerkUser: {
  emailAddresses?: Array<{ emailAddress?: string | null }> | null
  primaryEmailAddress?: { emailAddress?: string | null } | null
}) {
  return (
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses?.[0]?.emailAddress ??
    undefined
  )
}

function getAppPublicOrigin() {
  const rawOrigin = getConvexEnv().APP_PUBLIC_ORIGIN?.trim()

  if (!rawOrigin) {
    throw new Error(
      "Missing APP_PUBLIC_ORIGIN. Stripe Connect onboarding requires an absolute app origin."
    )
  }

  try {
    return new URL(rawOrigin).origin
  } catch {
    throw new Error(
      "Invalid APP_PUBLIC_ORIGIN. Use an absolute URL such as https://codstats.tech."
    )
  }
}

function buildCreatorCodeBase(args: {
  email?: string
  fallback: string
  name?: string | null
}) {
  const emailLocalPart = args.email?.split("@")[0]
  const seed =
    buildCreatorCodeSeed(args.name) ||
    buildCreatorCodeSeed(emailLocalPart) ||
    buildCreatorCodeSeed(args.fallback) ||
    "CREATOR"

  return seed.length >= 3 ? seed : `${seed}COD`.slice(0, 3)
}

async function buildAvailableCreatorCode(ctx: ActionCtx, base: string) {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const suffix = attempt === 0 ? "" : String(attempt + 1)
    const candidate = normalizeCreatorCode(
      `${base.slice(0, 24 - suffix.length)}${suffix}`
    )

    if (!candidate) {
      continue
    }

    const existingAccount = await ctx.runQuery(
      internal.queries.creator.internal.getCreatorAccountByNormalizedCode,
      {
        normalizedCode: candidate,
      }
    )

    if (!existingAccount) {
      return candidate
    }
  }

  throw new Error("Unable to generate an available creator code.")
}

async function createCreatorAccountFromDefaults(args: {
  ctx: ActionCtx
  email?: string
  user: Doc<"users">
}) {
  const defaults =
    (await args.ctx.runQuery(
      internal.queries.creator.internal.getCreatorProgramDefaults,
      {}
    )) ?? DEFAULT_CREATOR_PROGRAM_DEFAULTS
  const country = normalizeCreatorCountry(defaults.defaultCountry)

  if (!country) {
    throw new Error(
      "Creator country is not configured. Update creator program defaults before starting Stripe onboarding."
    )
  }

  const code = await buildAvailableCreatorCode(
    args.ctx,
    buildCreatorCodeBase({
      email: args.email,
      fallback: args.user.clerkUserId,
      name: args.user.name,
    })
  )
  const creatorAccount = await args.ctx.runMutation(
    internal.mutations.creator.internal.upsertCreatorAccount,
    {
      clerkUserId: args.user.clerkUserId,
      code,
      codeActive: defaults.defaultCodeActive,
      country,
      discountPercent: defaults.defaultDiscountPercent,
      payoutEligible: defaults.defaultPayoutEligible,
      payoutPercent: defaults.defaultPayoutPercent,
      userId: args.user._id,
    }
  )

  if (!creatorAccount) {
    throw new Error("Unable to create creator profile.")
  }

  return creatorAccount
}

async function requireCurrentCreatorConnectContext(
  ctx: ActionCtx,
  options?: {
    createIfMissing?: boolean
  }
) {
  const identity = await ctx.auth.getUserIdentity()

  if (!identity) {
    throw new Error("Authentication required.")
  }

  const user = await ctx.runQuery(
    internal.queries.creator.internal.getUserByClerkUserId,
    {
      clerkUserId: identity.subject,
    }
  )

  if (!user) {
    throw new Error("User not found.")
  }

  let creatorAccount = await ctx.runQuery(
    internal.queries.creator.internal.getCreatorAccountByUserId,
    {
      userId: user._id,
    }
  )

  if (!creatorAccount) {
    if (!options?.createIfMissing) {
      throw new Error("Creator profile not configured.")
    }

    const billingState = await ctx.runQuery(
      internal.queries.billing.resolution.resolveUserPlanState,
      {
        userId: user._id,
      }
    )

    if (
      !hasCreatorWorkspaceAccess({
        fallbackPlanKey: user.plan,
        state: billingState,
        userRole: user.role,
      })
    ) {
      throw new Error("Creator workspace access is required.")
    }

    const clerkUser = await getClerkBackendClient().users.getUser(
      identity.subject
    )
    const creatorEmail = getPrimaryEmail(clerkUser)

    creatorAccount = await createCreatorAccountFromDefaults({
      ctx,
      email: creatorEmail,
      user,
    })
  }

  return {
    creatorAccount,
    identity,
    user,
  }
}

async function syncCreatorStripeAccount(args: {
  creatorAccountId: Id<"creatorAccounts">
  ctx: ActionCtx
  stripeConnectedAccountId: string
}) {
  let snapshot:
    | ReturnType<typeof mapStripeConnectedAccountSnapshot>
    | ReturnType<typeof mapStripeConnectedAccountV2Snapshot>

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
    internal.mutations.creator.internal.applyStripeConnectedAccountSnapshot,
    {
      ...snapshot,
      creatorAccountId: args.creatorAccountId,
    }
  )

  return snapshot
}

export const syncCurrentCreatorConnectAccount = action({
  args: {},
  handler: async (ctx) => {
    const { creatorAccount } = await requireCurrentCreatorConnectContext(ctx)

    if (!creatorAccount.stripeConnectedAccountId) {
      return {
        connected: false,
        synced: false,
      }
    }

    const snapshot = await syncCreatorStripeAccount({
      creatorAccountId: creatorAccount._id,
      ctx,
      stripeConnectedAccountId: creatorAccount.stripeConnectedAccountId,
    })

    return {
      connected: true,
      payoutsEnabled: snapshot.payoutsEnabled,
      requirementsDueCount: snapshot.requirementsDue.length,
      synced: true,
    }
  },
})

export const startHostedOnboarding = action({
  args: {},
  handler: async (ctx) => {
    const { creatorAccount, identity, user } =
      await requireCurrentCreatorConnectContext(ctx, {
        createIfMissing: true,
      })
    const stripe = getStripe()
    const appOrigin = getAppPublicOrigin()
    const country =
      normalizeCreatorCountry(creatorAccount.country) ??
      normalizeCreatorCountry(DEFAULT_CREATOR_PROGRAM_DEFAULTS.defaultCountry)

    if (!country) {
      throw new Error(
        "Creator country is not configured. Update the creator account before starting Stripe onboarding."
      )
    }

    const clerkUser = await getClerkBackendClient().users.getUser(
      identity.subject
    )
    const creatorEmail = getPrimaryEmail(clerkUser)

    if (!creatorEmail) {
      throw new Error(
        "A primary email address is required before Stripe onboarding can start."
      )
    }

    const refreshUrl = `${appOrigin}${CONNECT_START_PATH}?reason=refresh`
    const returnUrl = `${appOrigin}${CONNECT_RETURN_PATH}`
    let onboardingUrl: string

    if (!creatorAccount.stripeConnectedAccountId) {
      const stripeAccount = await createStripeRecipientAccountV2({
        clerkUserId: user.clerkUserId,
        country,
        creatorAccountId: creatorAccount._id,
        creatorCode: creatorAccount.code,
        displayName: user.name ?? creatorAccount.code,
        email: creatorEmail,
        userId: user._id,
      })
      const snapshot = mapStripeConnectedAccountV2Snapshot(stripeAccount)

      await ctx.runMutation(
        internal.mutations.creator.internal.applyStripeConnectedAccountSnapshot,
        {
          ...snapshot,
          creatorAccountId: creatorAccount._id,
        }
      )

      const accountLink = await createStripeAccountLinkV2({
        accountId: stripeAccount.id,
        mode: "account_onboarding",
        refreshUrl,
        returnUrl,
      })

      onboardingUrl = accountLink.url
    } else {
      let legacyAccountId: string | null = null

      try {
        const stripeAccount = await retrieveStripeAccountV2(
          creatorAccount.stripeConnectedAccountId
        )
        const snapshot = mapStripeConnectedAccountV2Snapshot(stripeAccount)

        await ctx.runMutation(
          internal.mutations.creator.internal
            .applyStripeConnectedAccountSnapshot,
          {
            ...snapshot,
            creatorAccountId: creatorAccount._id,
          }
        )

        const accountLink = await createStripeAccountLinkV2({
          accountId: stripeAccount.id,
          mode:
            snapshot.requirementsDue.length > 0
              ? "account_onboarding"
              : "account_update",
          refreshUrl,
          returnUrl,
        })

        onboardingUrl = accountLink.url
      } catch (error) {
        if (!isStripeV2CompatibilityError(error)) {
          throw error
        }

        legacyAccountId = creatorAccount.stripeConnectedAccountId
      }

      if (legacyAccountId) {
        const stripeAccount = await stripe.accounts.retrieve(legacyAccountId)
        const snapshot = {
          ...mapStripeConnectedAccountSnapshot(stripeAccount),
          stripeConnectedAccountVersion: "v1" as const,
        }

        await ctx.runMutation(
          internal.mutations.creator.internal
            .applyStripeConnectedAccountSnapshot,
          {
            ...snapshot,
            creatorAccountId: creatorAccount._id,
          }
        )

        const accountLink = await stripe.accountLinks.create({
          account: stripeAccount.id,
          collection_options:
            snapshot.requirementsDue.length > 0
              ? {
                  fields: "eventually_due",
                }
              : undefined,
          refresh_url: refreshUrl,
          return_url: returnUrl,
          type:
            snapshot.requirementsDue.length > 0
              ? "account_onboarding"
              : "account_update",
        })

        onboardingUrl = accountLink.url
      }
    }

    return {
      url: onboardingUrl,
    }
  },
})
