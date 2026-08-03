import {
  LandingCreatorToolsSection,
  LandingFeatureList,
  LandingHeroSection,
  LandingPricingTeaser,
  LandingProductSection,
  LandingStackSection,
} from "@/features/landing/components/LandingSections"

export function LandingDesktopView() {
  return (
    <>
      <section className="grid items-start gap-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(26rem,0.9fr)] lg:gap-20">
        <LandingHeroSection viewport="desktop" />
        <LandingProductSection viewport="desktop" />
      </section>
      <section className="mt-24 grid gap-20">
        <LandingFeatureList viewport="desktop" />
        <LandingCreatorToolsSection viewport="desktop" />
        <LandingPricingTeaser viewport="desktop" />
        <LandingStackSection viewport="desktop" />
      </section>
    </>
  )
}
