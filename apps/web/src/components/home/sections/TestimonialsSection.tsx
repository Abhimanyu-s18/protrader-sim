/**
 * TestimonialsSection - Customer testimonials
 */
import { TESTIMONIALS, testimonialDisclaimer } from './testimonials-constants'

function getApprovedTestimonials() {
  const isDev = process.env.NODE_ENV === 'development'

  return TESTIMONIALS.filter((t) => {
    if (t.source === 'verified' && t.consentGiven) return true

    if (!isDev && t.source === 'placeholder') return false
    if (!isDev && !t.consentGiven) return false

    return isDev
  })
}

export function TestimonialsSection() {
  const approvedTestimonials = getApprovedTestimonials()

  if (approvedTestimonials.length === 0) {
    return null
  }

  return (
    <section id="testimonials" className="bg-surface-alt py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-primary-500">
            Testimonials
          </p>
          <h2 className="text-3xl font-bold text-dark-700 md:text-4xl">
            Trusted by Thousands of Traders
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {approvedTestimonials.map((t) => (
            <div key={t.id} className="rounded-2xl bg-white p-8 shadow-card">
              {/* Stars */}
              <div className="mb-5 flex gap-1" role="img" aria-label={`${t.rating} out of 5 stars`}>
                {Array.from({ length: Math.max(0, Math.min(5, Math.round(t.rating))) }).map(
                  (_, si) => (
                    <svg
                      key={si}
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="#D68910"
                      aria-hidden="true"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ),
                )}
              </div>

              {/* Quote */}
              <p className="mb-6 text-sm leading-relaxed text-gray-700">&ldquo;{t.text}&rdquo;</p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div
                  className={`h-10 w-10 rounded-full ${t.color} flex flex-shrink-0 items-center justify-center text-sm font-bold text-white`}
                >
                  {t.initials}
                </div>
                <div>
                  <div className="text-sm font-semibold text-dark-700">
                    {t.name}{' '}
                    <span role="img" aria-label={t.flagLabel}>
                      {t.flag}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">{t.role}</div>
                  {t.source !== 'verified' && (
                    <div className="mt-1 text-xs text-gray-400">Simulated testimonial</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="mt-12 text-center">
          <p className="mx-auto max-w-2xl text-xs text-gray-500">{testimonialDisclaimer}</p>
        </div>
      </div>
    </section>
  )
}
