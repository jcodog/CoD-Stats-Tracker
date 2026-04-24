import type { Id } from "../_generated/dataModel"
import { getConvexEnv } from "../env"
import { STRIPE_CATALOG_APP } from "./stripe"

export type StripeV2AccountLink = {
  account: string
  expires_at?: string | null
  object: "v2.core.account_link"
  url: string
}

export type StripeV2Account = {
  configuration?: {
    recipient?: {
      capabilities?: {
        stripe_balance?: {
          payouts?: {
            status?: "active" | "pending" | "restricted" | "unsupported" | null
            status_details?: Array<{
              code?: string
              resolution?: string
            }> | null
          } | null
          stripe_transfers?: {
            status?: "active" | "pending" | "restricted" | "unsupported" | null
            status_details?: Array<{
              code?: string
              resolution?: string
            }> | null
          } | null
        } | null
      } | null
    } | null
  } | null
  contact_email?: string | null
  id: string
  metadata?: Record<string, string> | null
  object: "v2.core.account"
  requirements?: {
    entries?: Array<{
      awaiting_action_from?: "stripe" | "user" | null
      description: string
      minimum_deadline?: {
        status?: "currently_due" | "eventually_due" | "past_due" | null
        time?: string | null
      } | null
      requested_reasons?: Array<{
        code?: string
      }> | null
    }> | null
  } | null
}

export class StripeV2ApiError extends Error {
  code?: string
  status: number

  constructor(message: string, options: { code?: string; status: number }) {
    super(message)
    this.code = options.code
    this.status = options.status
  }
}

const STRIPE_V2_API_BASE_URL = "https://api.stripe.com"
const STRIPE_V2_API_VERSION = "2026-03-25.dahlia" as const
const STRIPE_V2_ACCOUNT_INCLUDE = [
  "configuration.recipient",
  "defaults",
  "future_requirements",
  "identity",
  "requirements",
] as const

function getStripeSecretKey() {
  const stripeSecretKey = getConvexEnv().STRIPE_SECRET_KEY

  if (!stripeSecretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY")
  }

  return stripeSecretKey
}

async function callStripeV2Api<T>(args: {
  body?: unknown
  idempotencyKey?: string
  method: "GET" | "POST"
  path: string
  searchParams?: URLSearchParams
}) {
  const url = new URL(
    `${STRIPE_V2_API_BASE_URL}${args.path}${args.searchParams ? `?${args.searchParams.toString()}` : ""}`
  )
  const response = await fetch(url, {
    body:
      args.body === undefined ? undefined : JSON.stringify(args.body),
    headers: {
      Authorization: `Bearer ${getStripeSecretKey()}`,
      "Content-Type": "application/json",
      ...(args.idempotencyKey
        ? { "Idempotency-Key": args.idempotencyKey }
        : undefined),
      "Stripe-Version": STRIPE_V2_API_VERSION,
    },
    method: args.method,
  })

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as
      | {
          error?: {
            code?: string
            message?: string
          }
        }
      | null

    throw new StripeV2ApiError(
      errorPayload?.error?.message ?? "Stripe Accounts v2 request failed.",
      {
        code: errorPayload?.error?.code,
        status: response.status,
      }
    )
  }

  return (await response.json()) as T
}

export function isStripeV2CompatibilityError(error: unknown) {
  return (
    error instanceof StripeV2ApiError &&
    (error.code === "account_not_yet_compatible_with_v2" ||
      error.code === "v1_account_instead_of_v2_account")
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
  return await callStripeV2Api<StripeV2Account>({
    body: {
      configuration: {
        recipient: {
          capabilities: {
            stripe_balance: {
              payouts: {
                requested: true,
              },
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
          requirements_collector: "stripe",
        },
      },
      display_name: args.displayName,
      identity: {
        country: args.country.toLowerCase(),
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
    idempotencyKey: [
      "creator",
      "connect",
      "v2",
      "account",
      args.creatorAccountId,
    ].join(":"),
    method: "POST",
    path: "/v2/core/accounts",
  })
}

export async function retrieveStripeAccountV2(accountId: string) {
  const searchParams = new URLSearchParams()

  for (const includeValue of STRIPE_V2_ACCOUNT_INCLUDE) {
    searchParams.append("include[]", includeValue)
  }

  return await callStripeV2Api<StripeV2Account>({
    method: "GET",
    path: `/v2/core/accounts/${accountId}`,
    searchParams,
  })
}

export async function createStripeAccountLinkV2(args: {
  accountId: string
  mode: "account_onboarding" | "account_update"
  refreshUrl: string
  returnUrl: string
}) {
  return await callStripeV2Api<StripeV2AccountLink>({
    body: {
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
    },
    method: "POST",
    path: "/v2/core/account_links",
  })
}
