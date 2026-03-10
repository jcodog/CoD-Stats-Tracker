import "server-only"

import { auth } from "@clerk/nextjs/server"
import { fetchAction } from "convex/nextjs"
import { NextResponse } from "next/server"

import { api } from "@workspace/backend/convex/_generated/api"

import { isFlagEnabled } from "@/lib/flags"

export const BILLING_CSRF_HEADER = "x-codstats-csrf"
export const BILLING_CSRF_HEADER_VALUE = "1"

export function billingJsonError(args: {
  code: string
  message: string
  status: number
}) {
  return NextResponse.json(
    {
      ok: false,
      error: args.code,
      message: args.message,
    },
    {
      status: args.status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  )
}

export async function requireBillingRouteSession() {
  const { userId, getToken } = await auth()

  if (!userId) {
    return {
      ok: false as const,
      response: billingJsonError({
        code: "unauthenticated",
        message: "Authentication required.",
        status: 401,
      }),
    }
  }

  const token = await getToken({ template: "convex" }).catch(() => null)

  if (!token) {
    return {
      ok: false as const,
      response: billingJsonError({
        code: "missing_convex_token",
        message: "Unable to initialize billing for this session.",
        status: 500,
      }),
    }
  }

  return {
    ok: true as const,
    token,
    userId,
  }
}

export async function requireCheckoutEnabled() {
  const enabled = await isFlagEnabled("checkout")

  if (!enabled) {
    return {
      ok: false as const,
      response: billingJsonError({
        code: "checkout_disabled",
        message: "Checkout is currently unavailable.",
        status: 403,
      }),
    }
  }

  return {
    ok: true as const,
  }
}

export function toBillingRouteError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Billing request failed."
  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
      ? error.status
      : 500
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : "billing_error"

  return billingJsonError({
    code,
    message,
    status,
  })
}

export async function runCreateSubscriptionIntent(args: {
  input: {
    attemptKey?: string
    interval: "month" | "year"
    planKey: string
  }
  token: string
}) {
  return await fetchAction(
    api.actions.billing.customer.createSubscriptionIntent,
    args.input,
    {
      token: args.token,
    }
  )
}

export async function runPreviewSubscriptionChange(args: {
  input: {
    interval: "month" | "year"
    planKey: string
  }
  token: string
}) {
  return await fetchAction(
    api.actions.billing.customer.previewSubscriptionChange,
    args.input,
    {
      token: args.token,
    }
  )
}

export async function runChangeSubscription(args: {
  input: {
    interval: "month" | "year"
    planKey: string
  }
  token: string
}) {
  return await fetchAction(api.actions.billing.customer.changeSubscriptionPlan, args.input, {
    token: args.token,
  })
}

export async function runCancelSubscription(args: { token: string }) {
  return await fetchAction(api.actions.billing.customer.cancelCurrentSubscription, {}, {
    token: args.token,
  })
}

export async function runReactivateSubscription(args: { token: string }) {
  return await fetchAction(api.actions.billing.customer.reactivateCurrentSubscription, {}, {
    token: args.token,
  })
}

export async function runListInvoices(args: { token: string }) {
  return await fetchAction(api.actions.billing.customer.listInvoices, {}, {
    token: args.token,
  })
}
