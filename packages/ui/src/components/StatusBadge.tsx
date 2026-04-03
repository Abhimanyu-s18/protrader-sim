import * as React from 'react'
import { Badge } from './Badge'

const KYC_VARIANTS: Record<string, 'success' | 'danger' | 'warning' | 'default'> = {
  APPROVED: 'success',
  REJECTED: 'danger',
  PENDING: 'warning',
  NOT_STARTED: 'default',
  ADDITIONAL_REQUIRED: 'warning',
}
const DEPOSIT_VARIANTS: Record<string, 'success' | 'danger' | 'warning' | 'default'> = {
  COMPLETED: 'success',
  REJECTED: 'danger',
  PENDING: 'warning',
  CONFIRMING: 'warning',
  EXPIRED: 'default',
}
const TRADE_VARIANTS: Record<string, 'success' | 'danger' | 'warning' | 'default'> = {
  OPEN: 'success',
  CLOSED: 'default',
  PENDING: 'warning',
  CANCELLED: 'danger',
}

export function KycStatusBadge({ status }: { status: string }) {
  return <Badge variant={KYC_VARIANTS[status] ?? 'default'}>{status.replace('_', ' ')}</Badge>
}
export function DepositStatusBadge({ status }: { status: string }) {
  return <Badge variant={DEPOSIT_VARIANTS[status] ?? 'default'}>{status}</Badge>
}
export function TradeStatusBadge({ status }: { status: string }) {
  return <Badge variant={TRADE_VARIANTS[status] ?? 'default'}>{status}</Badge>
}
