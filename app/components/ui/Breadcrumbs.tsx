'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const INK = '#1e130c'
const ACCENT = '#8b6d22'
const MUTED = '#7a6350'

interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[]
  showHome?: boolean
  maxItems?: number
  className?: string
  // legacy props
  separator?: React.ReactNode
}

export default function Breadcrumbs({
  items,
  showHome = true,
  maxItems = 5,
  className = '',
}: BreadcrumbsProps) {
  const pathname = usePathname()

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const paths = pathname.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbItem[] = []

    if (showHome) {
      breadcrumbs.push({
        label: 'Início',
        href: paths[0] === 'dashboard' ? '/dashboard' : '/student-dashboard',
      })
    }

    let currentPath = ''
    paths.forEach((path, index) => {
      currentPath += `/${path}`

      if (showHome && index === 0 && (path === 'dashboard' || path === 'student-dashboard')) {
        return
      }

      const label = path
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')

      breadcrumbs.push({
        label,
        href: index === paths.length - 1 ? undefined : currentPath,
      })
    })

    return breadcrumbs
  }

  const allItems = items || generateBreadcrumbs()

  const displayItems =
    allItems.length <= maxItems
      ? allItems
      : [allItems[0], { label: '…' }, ...allItems.slice(-(maxItems - 2))]

  return (
    <nav aria-label="Breadcrumb" className={className} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
      {displayItems.map((item, index) => (
        <Fragment key={index}>
          {index > 0 && (
            <span
              aria-hidden="true"
              style={{
                fontFamily: 'var(--font-lora, serif)',
                fontSize: '0.875rem',
                color: MUTED,
                opacity: 0.6,
              }}
            >
              ·
            </span>
          )}

          {item.href ? (
            <Link
              href={item.href}
              style={{
                fontFamily: 'var(--font-lora, serif)',
                fontSize: '0.875rem',
                color: MUTED,
                textDecoration: 'none',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = ACCENT }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = MUTED }}
            >
              {item.label}
            </Link>
          ) : (
            <span
              aria-current="page"
              style={{
                fontFamily: 'var(--font-lora, serif)',
                fontSize: '0.875rem',
                color: INK,
                fontWeight: 500,
              }}
            >
              {item.label}
            </span>
          )}
        </Fragment>
      ))}
    </nav>
  )
}
