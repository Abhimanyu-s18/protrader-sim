import * as React from 'react'
import { cn } from '../lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  id?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const generatedId = React.useId()
    const inputId = id ?? generatedId

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-dark-700 text-sm font-medium">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'border-surface-border text-dark w-full border-b bg-transparent pt-1 pb-2 text-sm outline-none',
            'placeholder:text-surface-border focus:border-primary transition-colors',
            error && 'border-danger',
            className,
          )}
          {...props}
        />
        {error && <p className="text-danger text-xs">{error}</p>}
        {hint && !error && <p className="text-dark-400 text-xs">{hint}</p>}
      </div>
    )
  },
)
Input.displayName = 'Input'
