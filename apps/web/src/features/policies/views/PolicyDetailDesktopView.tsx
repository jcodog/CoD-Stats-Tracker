import {
  PolicyBody,
  PolicyDirectory,
  PolicyIntro,
} from "@/features/policies/components/PolicySections"
import type { PolicyDocument } from "@/features/policies/lib/policies"

export function PolicyDetailDesktopView({
  policy,
}: {
  policy: PolicyDocument
}) {
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:items-start">
      <PolicyDirectory currentSlug={policy.slug} viewport="desktop" />
      <div className="grid gap-10">
        <PolicyIntro
          description={policy.description}
          summary={policy.summary}
          title={policy.title}
        />
        <PolicyBody policy={policy} viewport="desktop" />
      </div>
    </div>
  )
}
