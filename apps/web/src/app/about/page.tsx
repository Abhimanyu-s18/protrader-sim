import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn about ProTraderSim — our mission, values, and the team behind the platform.',
}

// ---------------------------------------------------------------------------
// Section 1: Hero
// ---------------------------------------------------------------------------

export interface CompanyStats {
  traders: string
  countries: string
  monthlyVolume: string
  uptime: string
}

const COMPANY_STATS: CompanyStats = {
  traders: '50,000+',
  countries: '195',
  monthlyVolume: '$2.8B',
  uptime: '99.7%',
}

function HeroSection() {
  return (
    <section
      className="relative flex min-h-[40vh] items-center overflow-hidden bg-dark-700"
      aria-label="About us hero"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, rgba(232,101,10,0.08) 0%, transparent 60%)',
        }}
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <h1 className="max-w-2xl text-5xl font-bold leading-tight text-white">
          Empowering Traders Worldwide
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-gray-300">
          ProTraderSim was built by traders, for traders. Our mission is to democratize access to
          professional-grade trading tools and education.
        </p>
        <div className="mt-10 flex items-center gap-12">
          <div>
            <p className="text-3xl font-bold text-white">{COMPANY_STATS.traders}</p>
            <p className="mt-1 text-sm text-gray-400">Traders</p>
          </div>
          <div className="h-10 w-px bg-white/20" aria-hidden="true" />
          <div>
            <p className="text-3xl font-bold text-white">{COMPANY_STATS.countries}</p>
            <p className="mt-1 text-sm text-gray-400">Countries</p>
          </div>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Section 2: Our Story
// ---------------------------------------------------------------------------

interface TimelineMilestone {
  year: string
  text: string
}

const MILESTONES: TimelineMilestone[] = [
  {
    year: '2015',
    text: 'Founded by a team of former hedge fund traders with a vision to democratize professional trading.',
  },
  {
    year: '2017',
    text: 'Launched web trading platform and reached 5,000 active users within the first year.',
  },
  {
    year: '2020',
    text: 'Expanded to 150+ instruments and launched the mobile app for iOS and Android.',
  },
  {
    year: '2024',
    text: `${COMPANY_STATS.traders} active traders across ${COMPANY_STATS.countries} countries trust ProTraderSim as their primary simulation platform.`,
  },
]

function OurStorySection() {
  return (
    <section id="story" className="bg-white py-20" aria-labelledby="story-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-2">
          {/* Left: prose */}
          <div>
            <h2 id="story-heading" className="mb-8 text-3xl font-bold text-dark-700">
              Our Story
            </h2>
            <div className="space-y-5 leading-relaxed text-gray-600">
              <p>
                ProTraderSim was founded with the vision to provide professional trading simulation
                tools that remove the barriers to entry for aspiring traders worldwide. We believed
                that the complexity and cost of institutional trading infrastructure should not
                prevent talented individuals from developing and proving their edge.
              </p>
              <p>
                We built the platform on the principle that every trader deserves access to the same
                technology used by institutional players — tight spreads, fast execution, advanced
                risk management tools, and real-time market data. From the very first line of code,
                our execution engine was designed for speed and reliability, not bolted on as an
                afterthought.
              </p>
              <p>
                Today, with {COMPANY_STATS.traders} traders across {COMPANY_STATS.countries}{' '}
                countries, we continue to innovate and expand our platform capabilities. Every
                feature we ship is informed by our community of traders. Their feedback drives our
                roadmap, and their success is the metric we care most about.
              </p>
            </div>
          </div>

          {/* Right: timeline */}
          <div className="relative pl-8">
            {/* Vertical line */}
            <div
              className="absolute bottom-2 left-3 top-2 w-px bg-surface-border"
              aria-hidden="true"
            />
            <ol className="space-y-10">
              {MILESTONES.map((milestone) => (
                <li key={milestone.year} className="relative">
                  {/* Orange dot */}
                  <div
                    className="absolute -left-[21px] top-1 h-4 w-4 rounded-full border-2 border-white bg-primary-500 ring-2 ring-primary-500/20"
                    aria-hidden="true"
                  />
                  <p className="mb-1 text-sm font-bold text-primary-500">{milestone.year}</p>
                  <p className="text-sm leading-relaxed text-gray-600">{milestone.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Section 3: Why ProTraderSim
// ---------------------------------------------------------------------------

interface ReasonCard {
  title: string
  description: string
}

const REASONS: ReasonCard[] = [
  {
    title: 'Built by Traders',
    description:
      'Our founding team has 40+ years of combined trading experience across FX, equities and derivatives markets. We built what we wished existed.',
  },
  {
    title: 'Technology First',
    description:
      'We built our execution engine from scratch with speed and reliability as core principles, not afterthoughts. Sub-millisecond order acknowledgement, always.',
  },
  {
    title: 'Your Success = Our Success',
    description:
      'We only profit when you trade successfully. Our interests are perfectly aligned with yours — no conflict of interest, ever.',
  },
  {
    title: 'Transparent Pricing',
    description:
      'No hidden fees. Clear spreads and commissions published for everyone to see. What you read on the pricing page is exactly what you pay.',
  },
  {
    title: 'Continuous Innovation',
    description:
      'We ship platform updates every 2 weeks based on trader feedback and market needs. Our changelog is public and our roadmap is community-driven.',
  },
  {
    title: 'Global Infrastructure',
    description:
      'Data centers in London, New York, Tokyo and Singapore ensure low-latency access worldwide. Wherever you trade from, the platform is fast.',
  },
]

function WhySection() {
  return (
    <section id="why" className="bg-surface-alt py-20" aria-labelledby="why-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 text-center">
          <h2 id="why-heading" className="text-3xl font-bold text-dark-700">
            Why Choose ProTraderSim?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-gray-500">
            We're different from other trading platforms in ways that matter.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {REASONS.map((reason) => (
            <div
              key={reason.title}
              className="rounded-2xl border border-surface-border bg-white p-8 transition-shadow duration-200 hover:shadow-card-hover"
            >
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10">
                <div className="h-3 w-3 rounded-full bg-primary-500" aria-hidden="true" />
              </div>
              <h3 className="mb-3 text-base font-semibold text-dark-700">{reason.title}</h3>
              <p className="text-sm leading-relaxed text-gray-500">{reason.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Section 4: By the Numbers
// ---------------------------------------------------------------------------

interface Stat {
  value: string
  label: string
}

const STATS: Stat[] = [
  { value: COMPANY_STATS.traders, label: 'Traders' },
  { value: COMPANY_STATS.countries, label: 'Countries' },
  { value: COMPANY_STATS.monthlyVolume, label: 'Monthly Volume' },
  { value: COMPANY_STATS.uptime, label: 'Uptime' },
]

function StatsSection() {
  return (
    <section className="bg-dark-700 py-20" aria-labelledby="stats-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 id="stats-heading" className="mb-14 text-center text-3xl font-bold text-white">
          Trusted by Traders Around the World
        </h2>

        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-5xl font-bold text-white">{stat.value}</p>
              <p className="mt-3 text-sm font-medium text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Section 5: Our Values
// ---------------------------------------------------------------------------

function IconShield() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3L4 7V13C4 17.42 7.43 21.57 12 22C16.57 21.57 20 17.42 20 13V7L12 3Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="9,12 11,14 15,10"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconLightbulb() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 21H15M12 3C8.69 3 6 5.69 6 9C6 11.22 7.21 13.17 9 14.2V17H15V14.2C16.79 13.17 18 11.22 18 9C18 5.69 15.31 3 12 3Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconGlobe() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 3C12 3 8 7 8 12C8 17 12 21 12 21M12 3C12 3 16 7 16 12C16 17 12 21 12 21M3 12H21"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconLock() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M8 11V7C8 4.79 9.79 3 12 3C14.21 3 16 4.79 16 7V11"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16" r="1.5" fill="currentColor" />
    </svg>
  )
}

interface ValueCard {
  icon: ReactNode
  title: string
  description: string
}

const VALUES: ValueCard[] = [
  {
    icon: <IconShield />,
    title: 'Integrity',
    description:
      'We operate with complete transparency. What you see is what you get — no hidden fees, no misleading data, no conflicts of interest.',
  },
  {
    icon: <IconLightbulb />,
    title: 'Innovation',
    description:
      'We relentlessly improve our platform, constantly pushing the boundaries of what a trading platform can do. Complacency is not in our culture.',
  },
  {
    icon: <IconGlobe />,
    title: 'Inclusivity',
    description:
      'Professional trading tools should be accessible to everyone, regardless of account size or location. We build for the global trader.',
  },
  {
    icon: <IconLock />,
    title: 'Security',
    description:
      "Client funds are held in segregated accounts with tier-1 banking partners. Your capital's safety is our number one priority.",
  },
]

function ValuesSection() {
  return (
    <section className="bg-white py-20" aria-labelledby="values-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 id="values-heading" className="mb-14 text-center text-3xl font-bold text-dark-700">
          Our Core Values
        </h2>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((value) => (
            <div
              key={value.title}
              className="rounded-2xl border border-surface-border bg-surface-alt p-8 text-center"
            >
              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500/10 text-primary-500">
                {value.icon}
              </div>
              <h3 className="mb-3 text-base font-semibold text-dark-700">{value.title}</h3>
              <p className="text-sm leading-relaxed text-gray-500">{value.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Section 6: Leadership Team
// ---------------------------------------------------------------------------

interface TeamMember {
  initials: string
  name: string
  role: string
  bio: string
}

const TEAM: TeamMember[] = [
  {
    initials: 'AM',
    name: 'Alex Morrison',
    role: 'CEO & Co-Founder',
    bio: '15 years in FX trading at Deutsche Bank and Goldman Sachs. Founded ProTraderSim to democratize professional trading for everyone.',
  },
  {
    initials: 'SC',
    name: 'Sarah Chen',
    role: 'CTO',
    bio: 'Former lead engineer at Bloomberg. Built trading systems processing $50B+ daily volume. Leads all technical architecture at ProTraderSim.',
  },
  {
    initials: 'JO',
    name: 'James Okafor',
    role: 'Head of Markets',
    bio: '10 years as a prop trader. Expert in FX and commodity derivatives markets. Oversees instrument coverage and liquidity partnerships.',
  },
  {
    initials: 'PS',
    name: 'Priya Sharma',
    role: 'Head of Customer Success',
    bio: 'Former wealth manager with a background in institutional client services. Passionate about helping traders reach their financial goals.',
  },
]

function TeamSection() {
  return (
    <section className="bg-surface-alt py-20" aria-labelledby="team-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 id="team-heading" className="mb-14 text-center text-3xl font-bold text-dark-700">
          Meet the Team
        </h2>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TEAM.map((member) => (
            <div
              key={member.name}
              className="rounded-2xl bg-white p-6 text-center shadow-card transition-shadow duration-200 hover:shadow-card-hover"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-dark-700 text-lg font-bold text-primary-500">
                {member.initials}
              </div>
              <h3 className="font-semibold text-dark-700">{member.name}</h3>
              <p className="mb-3 mt-0.5 text-sm font-medium text-primary-500">{member.role}</p>
              <p className="text-sm leading-relaxed text-gray-500">{member.bio}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Section 7: CTA
// ---------------------------------------------------------------------------

function CTASection() {
  return (
    <section className="bg-primary-500 py-16" aria-labelledby="about-cta-heading">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <h2 id="about-cta-heading" className="text-3xl font-bold text-white">
          Join the ProTraderSim Community
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-white/80">
          Start trading alongside {COMPANY_STATS.traders} traders worldwide. Create your free
          account in minutes.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-lg bg-white px-8 py-3 font-semibold text-primary-600 shadow-sm transition-colors duration-150 hover:bg-gray-50"
          >
            Open Free Account
          </Link>
          <Link
            href="/about/contact"
            className="inline-flex items-center justify-center rounded-lg border border-white/40 px-8 py-3 font-medium text-white transition-colors duration-150 hover:bg-white/10"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/**
 * About page — company story, values, team, and stats.
 */
export default function AboutPage() {
  return (
    <>
      <HeroSection />
      <OurStorySection />
      <WhySection />
      <StatsSection />
      <ValuesSection />
      <TeamSection />
      <CTASection />
    </>
  )
}
