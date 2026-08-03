import Stripe from "stripe"

import type { Id } from "../../../convex/_generated/dataModel"
import { STRIPE_CATALOG_APP, getStripe } from "./client"

export const STRIPE_V2_ACCOUNT_INCLUDE = [
  "configuration.recipient",
  "defaults",
  "future_requirements",
  "identity",
  "requirements",
] satisfies Stripe.V2.Core.AccountRetrieveParams.Include[]

function getStripeErrorCode(error: unknown) {
  if (error instanceof Stripe.errors.StripeError) {
    return error.code
  }

  if (error instanceof Error && "code" in error) {
    return String(error.code)
  }

  return undefined
}

export function isStripeV2CompatibilityError(error: unknown) {
  const code = getStripeErrorCode(error)

  return (
    code === "account_not_yet_compatible_with_v2" ||
    code === "v1_account_instead_of_v2_account"
  )
}

export async function createStripeRecipientAccountV2(args: {
  clerkUserId: string
  country: string
  creatorAccountId: Id<"creatorAccounts">
  creatorCode: string
  displayName: string
  email: string
  userId: Id<"users">
}) {
  return await getStripe().v2.core.accounts.create(
    {
      configuration: {
        recipient: {
          capabilities: {
            stripe_balance: {
              stripe_transfers: {
                requested: true,
              },
            },
          },
        },
      },
      contact_email: args.email,
      dashboard: "none",
      defaults: {
        responsibilities: {
          fees_collector: "application",
          losses_collector: "application",
        },
      },
      display_name: args.displayName,
      identity: {
        country: args.country.toLowerCase(),
        entity_type: "individual",
      },
      include: STRIPE_V2_ACCOUNT_INCLUDE,
      metadata: {
        app: STRIPE_CATALOG_APP,
        clerkUserId: args.clerkUserId,
        creatorAccountId: args.creatorAccountId,
        creatorCode: args.creatorCode,
        userId: args.userId,
      },
    },
    {
      idempotencyKey: [
        "creator",
        "connect",
        "v2",
        "account",
        args.creatorAccountId,
      ].join(":"),
    }
  )
}

export async function retrieveStripeAccountV2(accountId: string) {
  return await getStripe().v2.core.accounts.retrieve(accountId, {
    include: STRIPE_V2_ACCOUNT_INCLUDE,
  })
}

export async function createStripeAccountLinkV2(args: {
  accountId: string
  mode: "account_onboarding" | "account_update"
  refreshUrl: string
  returnUrl: string
}) {
  return await getStripe().v2.core.accountLinks.create({
    account: args.accountId,
    use_case: {
      [args.mode]:
        args.mode === "account_onboarding"
          ? {
              collection_options: {
                fields: "eventually_due",
                future_requirements: "include",
              },
              configurations: ["recipient"],
              refresh_url: args.refreshUrl,
              return_url: args.returnUrl,
            }
          : {
              collection_options: {
                fields: "currently_due",
                future_requirements: "include",
              },
              configurations: ["recipient"],
              refresh_url: args.refreshUrl,
              return_url: args.returnUrl,
            },
      type: args.mode,
    },
  })
}
