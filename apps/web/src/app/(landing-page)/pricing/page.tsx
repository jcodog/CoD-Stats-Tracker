import type { Metadata } from "next"

import { PricingView } from "@/features/pricing/views/PricingView"
import { getSiteUrl } from "@/lib/metadata/site"

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Live CodStats plan pricing and included features from the current billing catalog.",
  alternates: {
    canonical: getSiteUrl("/pricing").toString(),
  },
}

export default function PricingPage() {
  return <PricingView />
}
