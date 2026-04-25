import Stripe from "stripe"

export class BillingActionError extends Error {
  code: string
  status: number

  constructor(code: string, message: string, status: number = 400) {
    super(message)
    this.code = code
    this.status = status
  }
}

export function sanitizeBillingError(error: unknown) {
  if (error instanceof BillingActionError) {
    return error
  }

  if (error instanceof Stripe.errors.StripeError) {
    return new BillingActionError(
      error.code ?? "stripe_error",
      error.message || "Billing request failed.",
      error.statusCode && error.statusCode >= 400 && error.statusCode < 500
        ? error.statusCode
        : 502
    )
  }

  return new BillingActionError(
    "billing_error",
    "Unable to complete the billing request.",
    500
  )
}
