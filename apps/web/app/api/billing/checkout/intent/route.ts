import { NextResponse } from "next/server"

import { createSubscriptionIntentSchema } from "@/features/billing/lib/billing-schemas"
import {
  requireBillingRouteSession,
  requireCheckoutEnabled,
  runCreateSubscriptionIntent,
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
    const payload = createSubscriptionIntentSchema.parse(await request.json())
    const result = await runCreateSubscriptionIntent({
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
