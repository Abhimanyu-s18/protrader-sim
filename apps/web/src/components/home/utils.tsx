/**
 * Shared utilities and icons for home page components
 */

import type { SVGProps } from 'react'

/** Helper to compute positivity from change string */
export function isPositiveChange(change: unknown): boolean {
  if (change == null) return false
  const trimmed = String(change).trim()
  return trimmed.startsWith('+')
}

export function IconBarChart({
  className,
  width = 32,
  height = 32,
  ...rest
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <rect x="3" y="18" width="6" height="11" rx="1.5" fill="currentColor" />
      <rect x="13" y="10" width="6" height="19" rx="1.5" fill="currentColor" />
      <rect x="23" y="4" width="6" height="25" rx="1.5" fill="currentColor" opacity="0.7" />
    </svg>
  )
}

export function IconLightning({
  className,
  width = 32,
  height = 32,
  ...rest
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <path d="M18 3L6 18h10l-2 11 14-17H18L18 3z" fill="currentColor" />
    </svg>
  )
}

export function IconShield({
  className,
  width = 32,
  height = 32,
  ...rest
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <path
        d="M16 2L4 7v9c0 7 5.5 12.5 12 14 6.5-1.5 12-7 12-14V7L16 2z"
        fill="currentColor"
        opacity="0.15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M11 16l3.5 3.5L21 12"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconHeadset({
  className,
  width = 32,
  height = 32,
  ...rest
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <path
        d="M8 20H6a3 3 0 01-3-3v-2a3 3 0 013-3h2v8zm16-8h2a3 3 0 013 3v2a3 3 0 01-3 3h-2v-8z"
        fill="currentColor"
        opacity="0.2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M6 15a10 10 0 0120 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M22 22c0 2.5-2.5 5-6 5s-6-2.5-6-5"
        stroke="#E8650A"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
