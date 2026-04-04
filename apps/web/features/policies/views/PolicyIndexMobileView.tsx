import { PolicyDirectory, PolicyIndexList, PolicyIntro } from "@/features/policies/components/PolicySections"

export function PolicyIndexMobileView() {
  return (
    <div className="grid gap-8">
      <PolicyIntro
        description="Public service, billing, privacy, GDPR, and dispute policies for CodStats."
        summary="These pages explain how CodStats handles service access, payments, data use, cookies, refunds, GDPR requests, and payment disputes."
        title="Policy Center"
      />
      <PolicyDirectory viewport="mobile" />
      <PolicyIndexList viewport="mobile" />
    </div>
  )
}
