/** Checkout is an operational policy, never a user-targeted experiment. */
export function isCheckoutEnabled(value: string | undefined): boolean {
  return value === "true"
}
