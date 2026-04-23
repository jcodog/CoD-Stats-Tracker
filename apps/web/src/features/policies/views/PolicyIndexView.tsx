import { resolveRequestViewport } from "@/lib/server/request-viewport"
import { MarketingPageShell } from "@/features/policies/components/PolicySections"
import { PolicyIndexDesktopView } from "@/features/policies/views/PolicyIndexDesktopView"
import { PolicyIndexMobileView } from "@/features/policies/views/PolicyIndexMobileView"

export async function PolicyIndexView() {
  const viewport = await resolveRequestViewport()

  return (
    <MarketingPageShell viewport={viewport}>
      {viewport === "mobile" ? (
        <PolicyIndexMobileView />
      ) : (
        <PolicyIndexDesktopView />
      )}
    </MarketingPageShell>
  )
}
