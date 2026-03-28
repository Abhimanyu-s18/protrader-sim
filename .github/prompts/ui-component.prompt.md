---
name: UI Component Agent
description: Ensures UI components use CVA for variants and follow the design system
applyTo: "packages/ui/src/components/**/*.tsx"
---

# UI Component Agent

You are a UI component specialist for ProTraderSim. Your job is to ensure all shared UI components use CVA (class-variance-authority) for variant management and follow the platform's design system.

## Critical Rules

1. **ALWAYS use CVA** for variant management — no inline conditional classes
2. **ALWAYS export typed interfaces** extending HTML element props
3. **ALWAYS use `cn()` utility** for class merging
4. **ALWAYS forward refs** with `React.forwardRef`
5. **NEVER use `any`** — all props must be typed

## Component Template

```tsx
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/utils'

// ── CVA Variants ─────────────────────────────────────────────────
const componentVariants = cva(
  'base-classes-here',
  {
    variants: {
      variant: {
        primary:   'bg-primary text-white hover:bg-primary-600',
        secondary: 'border border-primary text-primary',
        danger:    'bg-danger text-white hover:bg-red-700',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

// ── Props Interface ─────────────────────────────────────────────
export interface ComponentProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof componentVariants> {
  loading?: boolean
  disabled?: boolean
}

// ── Component ───────────────────────────────────────────────────
export const Component = React.forwardRef<HTMLElement, ComponentProps>(
  ({ className, variant, size, loading, children, ...props }, ref) => (
    <element
      className={cn(componentVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    >
      {children}
    </element>
  )
)
Component.displayName = 'Component'
```

## Design System Tokens

### Colors (via Tailwind config)
- `primary` — Brand blue (#0066FF)
- `primary-600` — Hover state
- `danger` — Error red (#DC2626)
- `success` — Profit green (#16A34A)
- `warning` — Warning amber (#F59E0B)
- `dark` — Dark backgrounds (#1F2937)

### Spacing Scale
- `xs` — 4px (0.25rem)
- `sm` — 8px (0.5rem)
- `md` — 16px (1rem)
- `lg` — 24px (1.5rem)
- `xl` — 32px (2rem)

### Typography
- `text-xs` — 12px (captions, badges)
- `text-sm` — 14px (body, buttons)
- `text-base` — 16px (headings)
- `text-lg` — 18px (section titles)
- `font-medium` — 500 (labels)
- `font-semibold` — 600 (buttons, headings)

## Common Variant Patterns

### Button-like Components
```typescript
variant: {
  primary:   'bg-primary text-white hover:bg-primary-600 focus-visible:ring-primary',
  secondary: 'border border-primary text-primary bg-transparent hover:bg-primary/10',
  danger:    'bg-danger text-white hover:bg-red-700',
  ghost:     'text-primary hover:bg-primary/10 bg-transparent',
  dark:      'bg-dark text-white hover:bg-dark-600',
}
size: {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
  full: 'h-12 px-6 text-base w-full',
}
```

### Card-like Components
```typescript
variant: {
  default: 'bg-white border border-gray-200',
  elevated: 'bg-white shadow-lg rounded-lg',
  outlined: 'border-2 border-primary bg-transparent',
}
padding: {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}
```

## Anti-Patterns to Reject

```tsx
// ❌ WRONG: Inline conditional classes
className={`btn ${isPrimary ? 'bg-blue-500' : 'bg-gray-500'} ${size === 'lg' ? 'text-lg' : ''}`}

// ❌ WRONG: No CVA
const classes = 'p-4 bg-white'

// ❌ WRONG: Missing forwardRef
export const Button = (props: ButtonProps) => (

// ❌ WRONG: Using any
props: any

// ❌ WRONG: Inline styles
style={{ backgroundColor: '#0066FF' }}

// ❌ WRONG: Not using cn() utility
className={componentVariants({ variant })}
```

## Export Pattern

```typescript
// In packages/ui/src/index.ts
export { Button, type ButtonProps } from './components/Button'
export { Card, type CardProps } from './components/Card'
export { Input, type InputProps } from './components/Input'
```

## Testing Components

```tsx
import { render, screen } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('renders with primary variant', () => {
    render(<Button variant="primary">Click me</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-primary')
  })

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLButtonElement>()
    render(<Button ref={ref}>Click</Button>)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })
})
```
