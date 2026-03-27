import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
  {
    variants: {
      variant: {
        default:  'bg-surface-alt text-dark-700',
        success:  'bg-green-100 text-success',
        danger:   'bg-red-100 text-danger',
        warning:  'bg-amber-100 text-warning',
        primary:  'bg-primary/10 text-primary',
        outline:  'border border-surface-border text-dark-700',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
