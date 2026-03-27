import * as React from 'react'
import { cn } from '../lib/utils'

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-lg bg-white shadow-card p-6', className)} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center justify-between mb-4', className)} {...props}>{children}</div>
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-base font-semibold text-dark', className)} {...props}>{children}</h3>
}
