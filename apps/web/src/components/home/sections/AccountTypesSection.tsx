import Link from 'next/link'
import { ACCOUNT_TYPES, type AccountType } from '../constants'

function formatSpreads(account: AccountType): string {
  if (account.spreadsPips === 0) return '0.0 pips'
  return `${account.spreadsPips.toFixed(1)} pips`
}

function formatLeverage(account: AccountType): string {
  return `${account.leverageNumerator}:${account.leverageDenominator}`
}

function formatCommission(account: AccountType): string {
  if (account.commissionPerLot === null) return 'Zero'
  return `$${account.commissionPerLot} / lot`
}

function formatMinDeposit(account: AccountType): string {
  return `$${account.minDepositAmount.toLocaleString()}`
}

/**
 * AccountTypesSection - Account tier comparison
 */
export function AccountTypesSection() {
  return (
    <section id="accounts" className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 text-center">
          <h2 className="mb-4 text-3xl font-bold text-dark-700 md:text-4xl">
            Choose Your Account Type
          </h2>
          <p className="text-lg text-gray-600">
            From beginners to institutional traders — we have an account for every level.
          </p>
          <p className="mt-3 text-sm text-gray-500">
            Leverage and account tier details shown here are illustrative/demo values only and not
            live offerings.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {ACCOUNT_TYPES.map((account) => (
            <div
              key={account.name}
              className={`relative rounded-3xl border p-8 shadow-sm transition duration-200 ${
                account.highlighted
                  ? 'border-primary-500 bg-primary-500 text-white'
                  : 'border-surface-border bg-white'
              }`}
            >
              {account.highlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-white px-4 py-1.5 text-xs font-bold text-primary-500">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3
                  className={`mb-1 text-xl font-bold ${account.highlighted ? 'text-white' : 'text-dark-700'}`}
                >
                  {account.name}
                </h3>
                <p className={`text-sm ${account.highlighted ? 'text-gray-200' : 'text-gray-500'}`}>
                  {account.tagline}
                </p>
              </div>

              <div
                className={`mb-6 space-y-3 border-b pb-6 ${
                  account.highlighted ? 'border-white/10' : 'border-surface-border'
                }`}
              >
                <div className="flex justify-between text-sm">
                  <span className={account.highlighted ? 'text-gray-200' : 'text-gray-500'}>
                    Spreads from
                  </span>
                  <span
                    className={`font-semibold ${account.highlighted ? 'text-white' : 'text-dark-700'}`}
                  >
                    {formatSpreads(account)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={account.highlighted ? 'text-gray-200' : 'text-gray-500'}>
                    Max Leverage
                  </span>
                  <span
                    className={`font-semibold ${account.highlighted ? 'text-white' : 'text-dark-700'}`}
                  >
                    {formatLeverage(account)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={account.highlighted ? 'text-gray-200' : 'text-gray-500'}>
                    Commission
                  </span>
                  <span
                    className={`font-semibold ${account.highlighted ? 'text-white' : 'text-dark-700'}`}
                  >
                    {formatCommission(account)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={account.highlighted ? 'text-gray-200' : 'text-gray-500'}>
                    Min Deposit
                  </span>
                  <span
                    className={`font-semibold ${account.highlighted ? 'text-white' : 'text-dark-700'}`}
                  >
                    {formatMinDeposit(account)}
                  </span>
                </div>
              </div>

              <ul className="mb-8 space-y-2.5">
                {account.features.map((feature, index) => (
                  <li
                    key={index}
                    className={`flex items-center gap-2.5 text-sm ${
                      account.highlighted ? 'text-gray-200' : 'text-gray-600'
                    }`}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className={account.highlighted ? 'text-amber-500' : 'text-green-700'}
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href={`/register?account=${encodeURIComponent(account.slug)}`}
                className={`block rounded-xl px-6 py-3 text-center text-sm font-semibold transition-all duration-200 ${
                  account.highlighted
                    ? 'bg-white text-primary-500 hover:bg-white/90'
                    : 'border border-dark-700 text-dark-700 hover:bg-dark-700 hover:text-white'
                }`}
              >
                Open {account.name} Account
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/accounts"
            className="text-sm font-medium text-primary-500 transition-colors hover:text-primary-600"
          >
            Compare all account features →
          </Link>
        </div>
      </div>
    </section>
  )
}
