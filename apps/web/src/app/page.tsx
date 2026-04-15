import {
  HeroSection,
  TickerBar,
  WhySection,
  InstrumentsSection,
  PlatformSection,
  AccountTypesSection,
  TestimonialsSection,
  StatsSection,
  FinalCtaSection,
} from '@/components/home/sections'

/**
 * Home page - Composes all section components
 *
 * Section components are organized in separate files for maintainability:
 * - HeroSection — Main hero banner with trading terminal mockup
 * - TickerBar — Scrolling ticker with market prices
 * - WhySection — Features and benefits cards
 * - InstrumentsSection — Tradeable instruments grid
 * - PlatformSection — Platform features and mockup
 * - AccountTypesSection — Account tier comparison
 * - TestimonialsSection — Customer testimonials
 * - StatsSection — Key metrics and statistics
 * - FinalCtaSection — Final call-to-action
 */
export default function HomePage() {
  return (
    <>
      <HeroSection />
      <TickerBar />
      <WhySection />
      <InstrumentsSection />
      <PlatformSection />
      <AccountTypesSection />
      <TestimonialsSection />
      <StatsSection />
      <FinalCtaSection />
    </>
  )
}
