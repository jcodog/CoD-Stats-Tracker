import {
  PolicyBody,
  PolicyDirectory,
  PolicyIntro,
} from "@/features/policies/components/PolicySections"
import type { PolicyDocument } from "@/features/policies/lib/policies"

export function PolicyDetailMobileView({
  policy,
}: {
  policy: PolicyDocument
}) {
  return (
    <div className="grid gap-8">
      <PolicyIntro
        description={policy.description}
        summary={policy.summary}
        title={policy.title}
      />
      <PolicyDirectory currentSlug={policy.slug} viewport="mobile" />
      <PolicyBody policy={policy} viewport="mobile" />
    </div>
  )
}
