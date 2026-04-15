export interface Testimonial {
  id: string
  rating: 1 | 2 | 3 | 4 | 5
  text: string
  name: string
  role: string
  flag: string
  flagLabel: string
  initials: string
  color: string
  consentGiven: boolean
  source: 'verified' | 'unverified' | 'placeholder'
  dateProvided?: string
}

/**
 * WARNING: These entries are placeholders for development only.
 * - source: 'placeholder' entries must NOT be displayed in production
 * - All real testimonials require documented explicit consent (consentGiven: true)
 * - Before adding real testimonials, ensure consent documentation is on file
 */
const allTestimonials: Testimonial[] = [
  {
    id: 'james-t',
    rating: 5,
    text: "The spreads are competitive and execution is reliable. I've been using ProTraderSim for 8 months and couldn't be happier.",
    name: 'James T.',
    role: 'Professional Trader',
    flag: '🇬🇧',
    flagLabel: 'United Kingdom',
    initials: 'JT',
    color: 'bg-blue-500',
    consentGiven: false,
    source: 'placeholder',
  },
  {
    id: 'priya-m',
    rating: 4,
    text: 'As a beginner, the platform was easy to learn but powerful enough as I grew. The 24/5 support team is always helpful.',
    name: 'Priya M.',
    role: 'Swing Trader',
    flag: '🇮🇳',
    flagLabel: 'India',
    initials: 'PM',
    color: 'bg-purple-500',
    consentGiven: false,
    source: 'placeholder',
  },
  {
    id: 'marcus-k',
    rating: 5,
    text: 'Excellent for testing strategies. The range of instruments is perfect for my portfolio approach.',
    name: 'Marcus K.',
    role: 'Algo Trader',
    flag: '🇩🇪',
    flagLabel: 'Germany',
    initials: 'MK',
    color: 'bg-emerald-600',
    consentGiven: false,
    source: 'placeholder',
  },
]

/**
 * Returns only testimonials safe for the current environment.
 * In production, filters out placeholders and non-consented entries.
 */
export const TESTIMONIALS: Testimonial[] =
  process.env.NODE_ENV === 'production'
    ? allTestimonials.filter((t) => t.source !== 'placeholder' && t.consentGiven)
    : allTestimonials

export const testimonialDisclaimer =
  'Testimonials shown are from users who have provided consent and have been independently verified where applicable.'

export const testimonialDisclaimerDev =
  'Testimonials are based on individual experiences and may not be representative of all users. Some testimonials may be simulated for demonstration purposes.'

/**
 * Environment-aware testimonial disclaimer.
 * Returns dev disclaimer for development environment, production disclaimer for production.
 */
export const testimonialDisclaimerEnv =
  process.env.NODE_ENV === 'production' ? testimonialDisclaimer : testimonialDisclaimerDev
