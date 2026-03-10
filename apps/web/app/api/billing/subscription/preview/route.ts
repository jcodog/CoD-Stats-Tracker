import { NextResponse } from "next/server"

import { subscriptionChangeSchema } from "@/features/billing/lib/billing-schemas"
import {
  requireBillingRouteSession,
  requireCheckoutEnabled,
  runPreviewSubscriptionChange,
  toBillingRouteError,
  BILLING_CSRF_HEADER,
  BILLING_CSRF_HEADER_VALUE,
} from "@/features/billing/lib/server/billing-route"
import { validateSameOriginJsonMutationRequest } from "@/lib/server/csrf"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const csrfError = validateSameOriginJsonMutationRequest({
    headerName: BILLING_CSRF_HEADER,
    headerValue: BILLING_CSRF_HEADER_VALUE,
    request,
  })

  if (csrfError) {
    return toBillingRouteError({
      code: "csrf_error",
      message: csrfError,
      status: 403,
    })
  }

  const session = await requireBillingRouteSession()

  if (!session.ok) {
    return session.response
  }

  const checkout = await requireCheckoutEnabled()

  if (!checkout.ok) {
    return checkout.response
  }

  try {
    const payload = subscriptionChangeSchema.parse(await request.json())

    if (payload.planKey === "free") {
      return NextResponse.json(
        {
          ok: true,
          result: await runPreviewSubscriptionChange({
            input: {
              interval: payload.interval,
              planKey: payload.planKey,
            },
            token: session.token,
          }),
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      )
    }

    const result = await runPreviewSubscriptionChange({
      input: payload,
      token: session.token,
    })

    return NextResponse.json(
      {
        ok: true,
        result,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    )
  } catch (error) {
    return toBillingRouteError(error)
  }
}
