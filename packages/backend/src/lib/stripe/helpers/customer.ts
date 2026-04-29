export function getMetadataStripeCustomerId(value: unknown): string | undefined {
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
