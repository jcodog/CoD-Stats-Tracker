import {
  PolicyDirectory,
  PolicyIndexList,
  PolicyIntro,
} from "@/features/policies/components/PolicySections"

export function PolicyIndexDesktopView() {
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:items-start">
      <PolicyDirectory viewport="desktop" />
      <div className="grid gap-10">
        <PolicyIntro
          description="Public service, billing, privacy, GDPR, and dispute policies for CodStats."
          summary="These pages explain how CodStats handles service access, payments, data use, cookies, refunds, GDPR requests, and payment disputes."
          title="Policy Center"
        />
        <PolicyIndexList viewport="desktop" />
      </div>
    </div>
  )
}
