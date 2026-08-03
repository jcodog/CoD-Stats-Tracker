import {
  LandingCreatorToolsSection,
  LandingFeatureList,
  LandingHeroSection,
  LandingPricingTeaser,
  LandingProductSection,
  LandingStackSection,
} from "@/features/landing/components/LandingSections"

export function LandingMobileView() {
  return (
    <div className="grid gap-10">
      <LandingHeroSection viewport="mobile" />
      <LandingProductSection viewport="mobile" />
      <LandingFeatureList viewport="mobile" />
      <LandingCreatorToolsSection viewport="mobile" />
      <LandingPricingTeaser viewport="mobile" />
      <LandingStackSection viewport="mobile" />
    </div>
  )
}
