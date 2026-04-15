/**
 * Icon size conventions:
 * - Contact/utility icons use 24x24 viewBox
 * - Category/navigation icons use 20x20 viewBox
 * - Menu icons (IconMenuOpen, IconMenuClose) use 24x24 for larger touch targets
 * - Small indicators like IconChevronDown use 14x14
 * - Components accept SVGProps<SVGSVGElement> and callers can override width/height via props
 * - Contributors should follow these conventions when adding new icons
 */
import type { SVGProps } from 'react'

export function IconForex(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6.5 13.5C6.5 13.5 7.5 15 10 15C12.5 15 13.5 13 13.5 11.5C13.5 9 11 8.5 10 8C9 7.5 7 7 7 5.5C7 4 8.5 3 10 3C11.5 3 12.5 4 12.5 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="10"
        y1="2"
        x2="10"
        y2="4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="10"
        y1="15"
        x2="10"
        y2="17"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function IconStocks(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <polyline
        points="2,14 6,9 9,12 13,6 17,8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="14,6 17,6 17,9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconIndices(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <rect x="2" y="11" width="3" height="7" rx="0.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="8.5" y="7" width="3" height="11" rx="0.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="15" y="4" width="3" height="14" rx="0.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function IconCommodities(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 2V4M10 16V18M2 10H4M16 10H18M4.22 4.22L5.64 5.64M14.36 14.36L15.78 15.78M4.22 15.78L5.64 14.36M14.36 5.64L15.78 4.22"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

/**
 * IconStar component renders a 5-point star icon.
 * Used for Crypto category, feature highlights, and similar purposes.
 */
export function IconStar(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="M10 2L12.5 7H17.5L13.5 10.5L15 16L10 12.5L5 16L6.5 10.5L2.5 7H7.5L10 2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** @deprecated Use IconStar instead */
export const IconCrypto = IconStar

export function IconCatalog(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <rect x="2" y="2" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="2" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2" y="11" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="11" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function IconCalendar(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <rect x="2" y="4" width="16" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="2" y1="8" x2="18" y2="8" stroke="currentColor" strokeWidth="1.5" />
      <line
        x1="6"
        y1="2"
        x2="6"
        y2="6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="14"
        y1="2"
        x2="14"
        y2="6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="7" cy="12" r="1" fill="currentColor" />
      <circle cx="10" cy="12" r="1" fill="currentColor" />
      <circle cx="13" cy="12" r="1" fill="currentColor" />
    </svg>
  )
}

export function IconAccount(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <rect x="2" y="2" width="16" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2" y="9" width="16" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <line
        x1="5"
        y1="16"
        x2="15"
        y2="16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function IconCompare(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="M4 10H16M4 10L7 7M4 10L7 13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconRegister(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3 17C3 14 6 12 10 12C12 12 13.8 12.7 15 14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="15"
        y1="14"
        x2="15"
        y2="18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="13"
        y1="16"
        x2="17"
        y2="16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function IconAbout(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
      <line
        x1="10"
        y1="9"
        x2="10"
        y2="14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="10" cy="6.5" r="0.75" fill="currentColor" />
    </svg>
  )
}

/** @deprecated Use IconStar instead */
export const IconWhy = IconStar

export function IconMenuOpen(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <line
        x1="3"
        y1="6"
        x2="21"
        y2="6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="3"
        y1="12"
        x2="21"
        y2="12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="3"
        y1="18"
        x2="21"
        y2="18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function IconMenuClose(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <line
        x1="5"
        y1="5"
        x2="19"
        y2="19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="19"
        y1="5"
        x2="5"
        y2="19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function IconChevronDown(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" {...props}>
      <polyline
        points="3,5 7,9 11,5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconChat(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

export function IconEmail(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}

/** @deprecated Use IconEmail instead for envelope icon functionality */
export const IconContact = IconEmail

export function IconPhone(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.4a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.68h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.1a16 16 0 0 0 6 6l1.27-.84a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

export function IconClock(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

export function IconLocation(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

export function IconLock(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

export function IconGlobe(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

export function IconArrowRight(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Platforms page icons (24x24 viewBox)
// ---------------------------------------------------------------------------

export function IconChart(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <polyline
        points="2,16 7,10 10,13 14,7 20,9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="2"
        y1="20"
        x2="22"
        y2="20"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function IconActivity(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <polyline
        points="2,12 6,12 8,5 10,19 12,12 14,8 16,15 18,12 22,12"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconLayers(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <polygon
        points="12,2 22,8.5 12,15 2,8.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="2,15 12,21.5 22,15"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconShield(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M12 2L3 7V13C3 17.5 7 21.7 12 23C17 21.7 21 17.5 21 13V7L12 2Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="8,12 11,15 16,10"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconHistory(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <polyline
        points="1,4 1,10 7,10"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.51 15A9 9 0 1 0 4.36 8.36L1 10"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="12,7 12,12 15,15"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconCode(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <polyline
        points="16,18 22,12 16,6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="8,6 2,12 8,18"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconCheck(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <polyline
        points="3,8 6,11 13,5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}