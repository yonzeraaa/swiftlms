'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'
import { motion } from 'framer-motion'

interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[]
  separator?: React.ReactNode
  showHome?: boolean
  maxItems?: number
  className?: string
}

export default function Breadcrumbs({
  items,
  separator = <ChevronRight className="w-4 h-4 text-gold-600" />,
  showHome = true,
  maxItems = 5,
  className = '',
}: BreadcrumbsProps) {
  const pathname = usePathname()

  // Generate breadcrumbs from pathname if items not provided
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const paths = pathname.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbItem[] = []

    // Add home if enabled
    if (showHome) {
      breadcrumbs.push({
        label: 'Início',
        href: paths[0] === 'dashboard' ? '/dashboard' : '/student-dashboard',
        icon: <Home className="w-4 h-4" />,
      })
    }

    // Build breadcrumb items from path
    let currentPath = ''
    paths.forEach((path, index) => {
      currentPath += `/${path}`
      
      // Skip the first segment if it's dashboard/student-dashboard and home is shown
      if (showHome && index === 0 && (path === 'dashboard' || path === 'student-dashboard')) {
        return
      }

      // Format label
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

  const breadcrumbItems = items || generateBreadcrumbs()

  // Handle max items with ellipsis
  const displayItems = () => {
    if (breadcrumbItems.length <= maxItems) {
      return breadcrumbItems
    }

    const firstItem = breadcrumbItems[0]
    const lastItems = breadcrumbItems.slice(-(maxItems - 2))
    
    return [
      firstItem,
      { label: '...', href: undefined },
      ...lastItems,
    ]
  }

  const itemsToDisplay = displayItems()

  return (
    <nav aria-label="Breadcrumb" className={`flex items-center space-x-2 ${className}`}>
      {itemsToDisplay.map((item, index) => (
        <Fragment key={index}>
          {index > 0 && (
            <span className="text-gold-600">
              {separator}
            </span>
          )}
          
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center"
          >
            {item.href ? (
              <Link
                href={item.href}
                className="flex items-center gap-1.5 text-sm font-medium text-gold-400 hover:text-gold-200 transition-colors"
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ) : (
              <span className="flex items-center gap-1.5 text-sm font-medium text-gold-100" aria-current="page">
                {item.icon}
                <span>{item.label}</span>
              </span>
            )}
          </motion.div>
        </Fragment>
      ))}
    </nav>
  )
}
