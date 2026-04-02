---
name: react-component-rules
description: Rules for React/Next.js component files
applyTo: '**/*.{tsx,jsx}'
---

# React Component Rules

## Component Structure

- Use functional components only (no class components)
- Export components as default or named exports consistently
- Keep components under 200 lines — extract sub-components when larger
- Use TypeScript for all props and state

## Props

- Define props interface/type above component
- Use `React.ComponentProps` for extending native elements
- Destructure props in function signature
- Provide default values for optional props

## State Management

- Use `useState` for local component state
- Use `useReducer` for complex state logic
- Use React Query for server state (API data)
- Use Zustand for global client state
- Avoid using `useContext` as a cache for server state; prefer React Query for server-state management

## Data Fetching

- Use React Query (`@tanstack/react-query`) for all API calls
- Always handle loading, error, and success states
- Use optimistic updates for better UX when appropriate
- Implement proper error boundaries

## Event Handlers

- Use `useCallback` for handlers passed to child components
- Name handlers with `handle` prefix (`handleSubmit`, `handleClick`)
- Keep handlers focused — extract complex logic to custom hooks

## Styling

- Use Tailwind CSS for all styling
- Use CVA (Class Variance Authority) for component variants
- Follow Terminal Precision design system colors
- Support dark mode with `dark:` prefix

## Accessibility

- All interactive elements must be keyboard accessible
- Use semantic HTML elements (`button`, `nav`, `main`, etc.)
- Add `aria-label` for icon-only buttons
- Ensure color contrast meets WCAG AA standards

## Examples

```tsx
'use client'

import { useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

interface TradeFormProps {
  instrumentId: string
  onSuccess?: () => void
}

export function TradeForm({ instrumentId, onSuccess }: TradeFormProps) {
  const [direction, setDirection] = useState<'BUY' | 'SELL'>('BUY')
  const [units, setUnits] = useState(1)
  const queryClient = useQueryClient()

  const openTrade = useMutation({
    mutationFn: (data: { direction: string; units: number }) =>
      apiClient.post(`/trades/open`, { ...data, instrumentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] })
      onSuccess?.()
    },
    onError: (error) => {
      // Report to monitoring service
      errorReporting.captureException(error, {
        tags: { component: 'TradeForm', action: 'openTrade' },
        extra: { direction, units, instrumentId },
      })

      // Show user-friendly notification
      showNotification({
        type: 'error',
        title: 'Trade Failed',
        message: 'Unable to open trade. Please check your connection and try again.',
      })

      // Optional: Implement retry logic for transient failures
      if (isRetryableError(error)) {
        setTimeout(() => openTrade.mutate({ direction, units }), 2000)
      }
    },
  })

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      openTrade.mutate({ direction, units })
    },
    [direction, units, openTrade.mutate],
  )

  return (
    <TradeForm
      onSubmit={handleSubmit}
      isLoading={openTrade.isPending}
      error={openTrade.error}
      direction={direction}
    />
  )
}

// Child component that receives the memoized handler
function TradeForm({
  onSubmit,
  isLoading,
  error,
  direction,
}: {
  onSubmit: (e: React.FormEvent) => void
  isLoading: boolean
  error: Error | null
  direction: string
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Form fields */}
      {error && (
        <div role="alert" className="text-red-500">
          Failed to open trade. Please try again.
        </div>
      )}
      <button type="submit" disabled={isLoading} className="btn-primary">
        {isLoading ? 'Opening...' : `Open ${direction}`}
      </button>
    </form>
  )
}
```
