import { MarketingPageShell } from "@/features/policies/components/PolicySections"
import type { PolicyDocument } from "@/features/policies/lib/policies"
import { PolicyDetailDesktopView } from "@/features/policies/views/PolicyDetailDesktopView"
import { PolicyDetailMobileView } from "@/features/policies/views/PolicyDetailMobileView"
import { resolveRequestViewport } from "@/lib/server/request-viewport"

export async function PolicyDetailView({
  policy,
}: {
  policy: PolicyDocument
}) {
  const viewport = await resolveRequestViewport()

  return (
    <MarketingPageShell viewport={viewport}>
      {viewport === "mobile" ? (
        <PolicyDetailMobileView policy={policy} />
      ) : (
        <PolicyDetailDesktopView policy={policy} />
      )}
    </MarketingPageShell>
  )
}
