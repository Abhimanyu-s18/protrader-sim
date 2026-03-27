import * as React from 'react'
import { cn } from '../lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-dark-700">{label}</label>}
      <input
        ref={ref}
        className={cn(
          'w-full border-b border-surface-border bg-transparent pb-2 pt-1 text-sm text-dark outline-none',
          'placeholder:text-surface-border focus:border-primary transition-colors',
          error && 'border-danger',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      {hint && !error && <p className="text-xs text-dark-400">{hint}</p>}
    </div>
  ),
)
Input.displayName = 'Input'
