import type { LandingMetricsResponse } from "@workspace/backend/landing/metrics"

import {
  LandingCreatorToolsSection,
  LandingFeatureList,
  LandingHeroSection,
  LandingPlatformList,
  LandingSnapshotSection,
  LandingStackSection,
} from "@/features/landing/components/LandingSections"

export function LandingMobileView({
  initialMetrics,
}: {
  initialMetrics: LandingMetricsResponse | null
}) {
  return (
    <div className="grid gap-10">
      <LandingHeroSection viewport="mobile" />
      <LandingSnapshotSection
        initialMetrics={initialMetrics}
        viewport="mobile"
      />
      <LandingFeatureList viewport="mobile" />
      <LandingPlatformList viewport="mobile" />
      <LandingCreatorToolsSection viewport="mobile" />
      <LandingStackSection viewport="mobile" />
    </div>
  )
}
