import { NextResponse } from "next/server"

import {
  requireBillingRouteSession,
  runListInvoices,
  toBillingRouteError,
} from "@/features/billing/lib/server/billing-route"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const session = await requireBillingRouteSession()

  if (!session.ok) {
    return session.response
  }

  try {
    const result = await runListInvoices({
      token: session.token,
    })

    return NextResponse.json(
      {
        ok: true,
        result,
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    )
  } catch (error) {
    return toBillingRouteError(error)
  }
}
