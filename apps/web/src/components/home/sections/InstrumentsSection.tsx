import InstrumentsPreview from '../InstrumentsPreview'

/**
 * InstrumentsSection - Grid of tradeable instruments
 */
export function InstrumentsSection() {
  return (
    <section id="instruments" className="bg-surface-alt py-20" aria-labelledby="instruments-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 id="instruments-heading" className="mb-4 text-3xl font-bold text-dark-700 md:text-4xl">
            Trade 150+ Global Instruments
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            From major Forex pairs to Stocks, Indices, Commodities and Crypto — all on one platform.
          </p>
        </div>

        <InstrumentsPreview />
      </div>
    </section>
  )
}
