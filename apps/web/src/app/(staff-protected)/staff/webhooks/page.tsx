import { redirect } from "next/navigation"

import { createPageMetadata } from "@/lib/metadata/page"

export const metadata = createPageMetadata("Subscription Audit Log")

export default async function StaffWebhooksPage() {
  redirect("/staff/subscriptions/audit-log")
}
