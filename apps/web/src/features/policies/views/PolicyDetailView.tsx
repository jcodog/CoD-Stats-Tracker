import {
  MarketingPageShell,
  PolicyBody,
  PolicyDirectory,
  PolicyIntro,
} from "@/features/policies/components/PolicySections"
import type { PolicyDocument } from "@/features/policies/lib/policies"

export function PolicyDetailView({ policy }: { policy: PolicyDocument }) {
  return (
    <MarketingPageShell>
      <div className="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-x-10">
        <div className="lg:col-start-2">
          <PolicyIntro
            description={policy.description}
            summary={policy.summary}
            title={policy.title}
          />
        </div>
        <div className="lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <PolicyDirectory currentSlug={policy.slug} />
        </div>
        <div className="min-w-0 lg:col-start-2">
          <PolicyBody policy={policy} />
        </div>
      </div>
    </MarketingPageShell>
  )
}
