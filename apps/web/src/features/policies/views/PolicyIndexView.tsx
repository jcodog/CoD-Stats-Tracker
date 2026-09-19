import {
  MarketingPageShell,
  PolicyDirectory,
  PolicyIndexList,
  PolicyIntro,
} from "@/features/policies/components/PolicySections"

export function PolicyIndexView() {
  return (
    <MarketingPageShell>
      <div className="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-x-10">
        <div className="lg:col-start-2">
          <PolicyIntro
            description="Public service, billing, privacy, GDPR, and dispute policies for CodStats."
            summary="These pages explain how CodStats handles service access, payments, data use, cookies, refunds, GDPR requests, and payment disputes."
            title="Policy Center"
          />
        </div>
        <div className="lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <PolicyDirectory />
        </div>
        <div className="min-w-0 lg:col-start-2">
          <PolicyIndexList />
        </div>
      </div>
    </MarketingPageShell>
  )
}
