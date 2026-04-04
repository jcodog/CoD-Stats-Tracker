import type { Metadata } from "next"

import { PolicyIndexView } from "@/features/policies/views/PolicyIndexView"
import { getSiteUrl } from "@/lib/metadata/site"

export const metadata: Metadata = {
  title: "Policies",
  description:
    "Public service, billing, privacy, cookie, refund, GDPR, and dispute policies for CodStats.",
  alternates: {
    canonical: getSiteUrl("/policies").toString(),
  },
}

export default function PoliciesPage() {
  return <PolicyIndexView />
}
