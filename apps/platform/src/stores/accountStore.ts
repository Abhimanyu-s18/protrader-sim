import { create } from 'zustand'
import type { AccountMetrics, WsAccountMetrics } from '@protrader/types'

interface AccountState {
  metrics: AccountMetrics | null
  isLoading: boolean
  setMetrics: (m: AccountMetrics) => void
  applyWsUpdate: (update: WsAccountMetrics) => void
  setLoading: (v: boolean) => void
}

export const useAccountStore = create<AccountState>((set) => ({
  metrics: null,
  isLoading: true,
  setMetrics: (metrics) => set({ metrics, isLoading: false }),
  applyWsUpdate: (update) =>
    set((state) => ({
      metrics: state.metrics
        ? {
            ...state.metrics,
            balance_cents: update.balance_cents,
            unrealized_pnl_cents: update.unrealized_pnl_cents,
            equity_cents: update.equity_cents,
            used_margin_cents: update.used_margin_cents,
            available_cents: update.available_cents,
            margin_level_bps: update.margin_level_bps,
          }
        : null,
    })),
  setLoading: (isLoading) => set({ isLoading }),
}))
