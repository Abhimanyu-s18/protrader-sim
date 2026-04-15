import React from 'react'
import { IconBarChart, IconLightning, IconShield, IconHeadset } from '../utils'

interface WhyCard {
  icon: React.ReactNode
  title: string
  description: string
  stat: string
}

const cards: WhyCard[] = [
  {
    icon: <IconBarChart aria-hidden="true" />,
    title: 'Ultra-Low Spreads',
    description:
      'From 0.0 pips on major pairs. Tight spreads mean lower trading costs and more profit potential.',
    stat: 'From 0.0 pips',
  },
  {
    icon: <IconLightning aria-hidden="true" />,
    title: 'Lightning Execution',
    description:
      'Sub-millisecond order execution with no requotes or rejections. Your order, your price.',
    stat: '<1ms Execution',
  },
  {
    icon: <IconShield aria-hidden="true" />,
    title: 'Segregated Funds',
    description:
      'Client funds held in segregated accounts at tier-1 banks. Your capital is always protected.',
    stat: '100% Segregated',
  },
  {
    icon: <IconHeadset aria-hidden="true" />,
    title: '24/5 Expert Support',
    description:
      'Our team of trading specialists is available around the clock to help with any questions.',
    stat: '24/5 Available',
  },
]

/**
 * WhySection - Features and benefits section
 */
export function WhySection() {
  return (
    <section id="why" className="bg-white py-20" aria-labelledby="why-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Labels */}
        <div className="mb-14 text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-primary-500">
            Why ProTrader Sim
          </p>
          <h2 id="why-heading" className="text-3xl font-bold text-dark-700 md:text-4xl">
            Everything You Need to Trade Like a Pro
          </h2>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <div
              key={card.title}
              className="group rounded-2xl border border-surface-border bg-white p-8 transition-all duration-300 hover:border-primary-500/30 hover:shadow-card-hover"
            >
              <div className="mb-5">{card.icon}</div>
              <h3 className="mb-3 text-lg font-bold text-dark-700">{card.title}</h3>
              <p className="mb-5 text-sm leading-relaxed text-gray-600">{card.description}</p>
              <p className="text-sm font-semibold text-primary-500">{card.stat}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
