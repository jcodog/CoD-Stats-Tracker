import type { LandingMetricsResponse } from "@workspace/backend/landing/metrics"

import {
  LandingCreatorToolsSection,
  LandingFeatureList,
  LandingHeroSection,
  LandingPlatformList,
  LandingSnapshotSection,
  LandingStackSection,
} from "@/features/landing/components/LandingSections"

export function LandingDesktopView({
  initialMetrics,
}: {
  initialMetrics: LandingMetricsResponse | null
}) {
  return (
    <>
      <section className="grid items-start gap-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(26rem,0.9fr)] lg:gap-20">
        <LandingHeroSection viewport="desktop" />
        <LandingSnapshotSection
          initialMetrics={initialMetrics}
          viewport="desktop"
        />
      </section>
      <section className="mt-24 grid gap-20">
        <LandingFeatureList viewport="desktop" />
        <LandingPlatformList viewport="desktop" />
        <LandingCreatorToolsSection viewport="desktop" />
        <LandingStackSection viewport="desktop" />
      </section>
    </>
  )
}
