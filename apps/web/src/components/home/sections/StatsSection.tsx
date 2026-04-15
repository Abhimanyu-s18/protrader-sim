const stats = [
  { value: '50,000+', label: 'Active Traders' },
  { value: '$2.8B+', label: 'Monthly Volume' },
  { value: '150+', label: 'Instruments' },
  { value: '10+', label: 'Years Experience' },
  { value: '98.9%', label: 'Uptime SLA' },
  { value: '195', label: 'Countries Served' },
] as const

/**
 * StatsSection - Key metrics and statistics
 */
export function StatsSection() {
  return (
    <section className="bg-dark-700 py-16" aria-label="Platform statistics">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6 lg:gap-0 lg:divide-x lg:divide-white/10">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center lg:px-6">
              <div className="mb-1 text-3xl font-bold text-white">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
