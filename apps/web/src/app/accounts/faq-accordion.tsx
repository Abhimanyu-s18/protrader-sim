'use client'

import { useId, useState } from 'react'

interface Faq {
  q: string
  a: string
}

interface FaqAccordionProps {
  faqs: Faq[]
}

export function FaqAccordion({ faqs }: FaqAccordionProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const id = useId()

  return (
    <div className="space-y-3">
      {faqs.map((faq, i) => (
        <div
          key={faq.q}
          className="overflow-hidden rounded-xl border border-surface-border bg-white"
        >
          <button
            type="button"
            onClick={() => setOpenFaq(openFaq === i ? null : i)}
            aria-expanded={openFaq === i}
            aria-controls={`${id}-panel-${i}`}
            className="flex w-full items-center justify-between px-6 py-5 text-left transition-colors duration-150 hover:bg-surface-alt/50"
          >
            <span className="pr-4 font-medium text-dark-700">{faq.q}</span>
            <svg
              className={`h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200 ${openFaq === i ? 'rotate-45' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <div
            id={`${id}-panel-${i}`}
            className={`border-t border-surface-border px-6 pb-5 pt-4 text-sm leading-relaxed text-gray-600 ${openFaq === i ? 'block' : 'hidden'}`}
          >
            {faq.a}
          </div>
        </div>
      ))}
    </div>
  )
}
