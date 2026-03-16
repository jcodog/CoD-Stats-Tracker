import { CheckoutView } from "@/features/billing/views/CheckoutView"
import { isFlagEnabled } from "@/lib/flags"

export default async function CheckoutPage() {
  const checkoutEnabled = await isFlagEnabled("checkout")

  return <CheckoutView checkoutEnabled={checkoutEnabled} />
}
