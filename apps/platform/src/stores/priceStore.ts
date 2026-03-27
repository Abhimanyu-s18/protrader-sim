import { create } from 'zustand'
import type { WsPriceUpdate } from '@protrader/types'

interface PriceState {
  prices: Record<string, WsPriceUpdate>
  updatePrice: (update: WsPriceUpdate) => void
  getPrice: (symbol: string) => WsPriceUpdate | undefined
}

export const usePriceStore = create<PriceState>((set, get) => ({
  prices: {},
  updatePrice: (update) =>
    set((state) => ({ prices: { ...state.prices, [update.symbol]: update } })),
  getPrice: (symbol) => get().prices[symbol],
}))
