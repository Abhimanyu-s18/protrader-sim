'use client'

import { useEffect } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useAccountStore } from '../stores/accountStore'
import { usePriceStore } from '../stores/priceStore'
import type { WsPriceUpdate, WsAccountMetrics } from '@protrader/types'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000'

let socketInstance: Socket | null = null
const activeSubscriptions = new Set<string>()

/** Returns a singleton Socket.io connection, creating it on first call. */
let currentToken: string | null = null

function getSocket(token: string): Socket {
  const needsNewSocket = !socketInstance || socketInstance.disconnected || currentToken !== token

  if (needsNewSocket) {
    socketInstance?.disconnect()
    activeSubscriptions.clear()
    currentToken = token
    socketInstance = io(API_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    })
  }
  return socketInstance as Socket
}

/**
 * Initialises the Socket.io connection and wires up global store updates.
 * Call once at the top-level authenticated layout.
 */
export function useSocket(token: string | null): void {
  const applyWsUpdate = useAccountStore((s) => s.applyWsUpdate)
  const updatePrice = usePriceStore((s) => s.updatePrice)

  useEffect(() => {
    if (!token) return

    const socket = getSocket(token)

    socket.on('prices:update', (data: WsPriceUpdate) => {
      updatePrice(data)
    })

    socket.on('account:metrics', (data: WsAccountMetrics) => {
      applyWsUpdate(data)
    })

    socket.on('connect_error', (err) => {
      console.error('[socket] connection error', err.message)
    })

    socket.on('connect', () => {
      if (activeSubscriptions.size > 0) {
        socket.emit('subscribe:prices', { symbols: Array.from(activeSubscriptions) })
      }
    })

    return () => {
      socket.off('prices:update')
      socket.off('account:metrics')
      socket.off('connect_error')
      socket.off('connect')
    }
  }, [token, applyWsUpdate, updatePrice])
}

/** Subscribe to live prices for a list of symbols. */
export function subscribePrices(symbols: string[]) {
  if (!socketInstance) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[socket] subscribePrices called before socket initialized. Symbols: ${symbols.join(', ')}`,
      )
    }
    return
  }

  symbols.forEach((s) => activeSubscriptions.add(s))

  if (!socketInstance.connected) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[socket] subscribePrices called while socket disconnected. Connecting and deferring subscribe for symbols: ${symbols.join(
          ', ',
        )}`,
      )
    }
    socketInstance.connect()
    return
  }

  socketInstance.emit('subscribe:prices', { symbols })
}

/** Unsubscribe from live prices for a list of symbols. */
export function unsubscribePrices(symbols: string[]) {
  if (!socketInstance) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[socket] unsubscribePrices called before socket initialized. Symbols: ${symbols.join(', ')}`,
      )
    }
    return
  }

  symbols.forEach((s) => activeSubscriptions.delete(s))

  if (!socketInstance.connected) {
    return
  }

  socketInstance.emit('unsubscribe:prices', { symbols })
}

/** Returns the raw socket instance (may be null before first call to useSocket). */
export function getSocketInstance(): Socket | null {
  return socketInstance
}
