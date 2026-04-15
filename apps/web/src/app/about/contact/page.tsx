import type { Metadata } from 'next'
import Link from 'next/link'
import { ContactForm } from '@/components/contact/ContactForm'
import {
  IconChat,
  IconEmail,
  IconPhone,
  IconClock,
  IconLocation,
  IconLock,
  IconGlobe,
} from '@/components/icons'

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    "Get in touch with the ProTraderSim support team. We're available 24 hours a day, 5 days a week.",
}

const SUPPORT_EMAIL = 'support@protrader.sim'

/** Contact page — hero, contact methods, form + office info */
export default function ContactPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section
        className="relative overflow-hidden py-16 md:py-20"
        style={{
          background:
            'radial-gradient(ellipse at 50% 60%, var(--color-accent-10), transparent 60%), var(--color-bg-900)',
        }}
      >
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="mb-4 text-4xl font-bold text-white md:text-5xl">
            We&apos;re Here to Help
          </h1>
          <p className="mx-auto max-w-xl text-lg text-gray-300">
            Our support team is available 24 hours a day, 5 days a week. Reach out any time and
            we&apos;ll get back to you as quickly as possible.
          </p>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="bg-white py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-dark-700 md:text-4xl">Get in Touch</h2>
            <p className="text-gray-500">Choose the support channel that works best for you.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Live Chat */}
            <div
              id="live-chat"
              className="rounded-2xl border border-surface-border bg-white p-8 text-center transition-shadow duration-200 hover:shadow-card-hover"
            >
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/10 text-primary-500">
                <IconChat width="28" height="28" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-dark-700">Live Chat</h3>
              <p className="mb-4 text-sm leading-relaxed text-gray-500">
                Chat with our support team instantly during market hours. Get answers in real time.
              </p>
              <div className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-500">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                Coming Soon
              </div>
              <div>
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  className="block w-full rounded-lg bg-primary-500 px-6 py-3 font-semibold text-white transition-colors duration-200 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  Start Chat (Coming Soon)
                </button>
              </div>
            </div>

            {/* Email */}
            <div className="rounded-2xl border border-surface-border bg-white p-8 text-center transition-shadow duration-200 hover:shadow-card-hover">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/10 text-primary-500">
                <IconEmail width="28" height="28" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-dark-700">Email Support</h3>
              <p className="mb-4 text-sm leading-relaxed text-gray-500">
                Send us a detailed message and we&apos;ll respond within 4 hours during business
                hours.
              </p>
              <div className="mb-5 text-sm font-medium text-dark-700">{SUPPORT_EMAIL}</div>
              <div>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="block rounded-lg border-2 border-primary-500 px-6 py-3 font-semibold text-primary-500 transition-colors duration-200 hover:bg-primary-500 hover:text-white"
                >
                  Send Email
                </a>
              </div>
            </div>

            {/* Phone */}
            <div className="rounded-2xl border border-surface-border bg-white p-8 text-center transition-shadow duration-200 hover:shadow-card-hover">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                <IconPhone width="28" height="28" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-dark-700">Phone Support</h3>
              <p className="mb-4 text-sm leading-relaxed text-gray-500">
                Available for Pro and VIP account holders. Speak directly with a senior support
                specialist.
              </p>
              <div className="mb-5 text-xs text-gray-400">
                Mon–Fri 8:00–20:00 UTC · Pro &amp; VIP only
              </div>
              <div>
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  className="w-full cursor-not-allowed rounded-lg border-2 border-gray-300 px-6 py-3 font-semibold text-gray-500"
                >
                  Available on Pro/VIP
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Form + Office Info */}
      <section className="bg-surface-alt py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Contact Form */}
            <div>
              <h2 className="mb-8 text-2xl font-bold text-dark-700">Send Us a Message</h2>
              <ContactForm />
            </div>

            {/* Office Info */}
            <div>
              <h2 className="mb-8 text-2xl font-bold text-dark-700">Support Hours &amp; Contact</h2>

              <div className="space-y-6">
                {[
                  {
                    icon: <IconClock width="20" height="20" />,
                    label: 'Trading Support',
                    value: '24/5 — Sunday 22:00 to Friday 22:00 UTC',
                  },
                  {
                    icon: <IconEmail width="20" height="20" />,
                    label: 'Email',
                    value: SUPPORT_EMAIL,
                  },
                  {
                    icon: <IconLocation width="20" height="20" />,
                    label: 'Headquarters',
                    value: 'Suite 1402, 1 Financial Street, London, EC2V 8BT',
                  },
                  {
                    icon: <IconLock width="20" height="20" />,
                    label: 'Regulated by',
                    value: 'Financial Services Authority (SimFSA)',
                  },
                  {
                    icon: <IconGlobe width="20" height="20" />,
                    label: 'Languages',
                    value: 'English, Spanish, French, German, Arabic, Chinese',
                  },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500">
                      {item.icon}
                    </div>
                    <div>
                      <div className="mb-0.5 text-sm font-medium text-gray-400">{item.label}</div>
                      <div className="font-medium text-dark-700">{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Warning box */}
              <div className="mt-8 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <p className="text-sm text-yellow-800">
                  <span className="font-semibold">⚡ Urgent account issue?</span> For matters
                  related to open positions, margin calls or account access, please contact{' '}
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium underline">
                    Email Support
                  </a>{' '}
                  for assistance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Links */}
      <section className="border-t border-surface-border bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-sm text-gray-500">
            Looking for something specific?{' '}
            <Link href="/accounts" className="font-medium text-primary-500 hover:text-primary-600">
              Account types
            </Link>
            {' · '}
            <Link
              href="/legal/terms"
              className="font-medium text-primary-500 hover:text-primary-600"
            >
              Terms of Service
            </Link>
            {' · '}
            <Link
              href="/legal/privacy"
              className="font-medium text-primary-500 hover:text-primary-600"
            >
              Privacy Policy
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}
