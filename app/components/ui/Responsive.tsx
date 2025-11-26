'use client'

import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// Responsive breakpoints hook
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'>('lg')
  
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      if (width < 640) setBreakpoint('xs')
      else if (width < 768) setBreakpoint('sm')
      else if (width < 1024) setBreakpoint('md')
      else if (width < 1280) setBreakpoint('lg')
      else if (width < 1536) setBreakpoint('xl')
      else setBreakpoint('2xl')
    }
    
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  return {
    breakpoint,
    isMobile: breakpoint === 'xs' || breakpoint === 'sm',
    isTablet: breakpoint === 'md',
    isDesktop: breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl',
  }
}

// Responsive Grid Component
interface ResponsiveGridProps {
  children: React.ReactNode
  cols?: {
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
    '2xl'?: number
  }
  gap?: number
  className?: string
}

export function ResponsiveGrid({
  children,
  cols = { xs: 1, sm: 2, md: 3, lg: 4, xl: 5, '2xl': 6 },
  gap = 4,
  className = '',
}: ResponsiveGridProps) {
  const colClasses = `
    grid
    grid-cols-${cols.xs || 1}
    sm:grid-cols-${cols.sm || 2}
    md:grid-cols-${cols.md || 3}
    lg:grid-cols-${cols.lg || 4}
    xl:grid-cols-${cols.xl || 5}
    2xl:grid-cols-${cols['2xl'] || 6}
    gap-${gap}
  `
  
  return (
    <div className={`${colClasses} ${className}`}>
      {children}
    </div>
  )
}

// Mobile Drawer Component
interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  position?: 'left' | 'right' | 'top' | 'bottom'
  size?: 'sm' | 'md' | 'lg' | 'full'
}

export function MobileDrawer({
  isOpen,
  onClose,
  children,
  position = 'left',
  size = 'md',
}: MobileDrawerProps) {
  const sizes = {
    sm: position === 'left' || position === 'right' ? 'w-64' : 'h-64',
    md: position === 'left' || position === 'right' ? 'w-80' : 'h-80',
    lg: position === 'left' || position === 'right' ? 'w-96' : 'h-96',
    full: position === 'left' || position === 'right' ? 'w-full' : 'h-full',
  }
  
  const positions = {
    left: {
      initial: { x: '-100%' },
      animate: { x: 0 },
      exit: { x: '-100%' },
      className: 'left-0 top-0 h-full',
    },
    right: {
      initial: { x: '100%' },
      animate: { x: 0 },
      exit: { x: '100%' },
      className: 'right-0 top-0 h-full',
    },
    top: {
      initial: { y: '-100%' },
      animate: { y: 0 },
      exit: { y: '-100%' },
      className: 'top-0 left-0 w-full',
    },
    bottom: {
      initial: { y: '100%' },
      animate: { y: 0 },
      exit: { y: '100%' },
      className: 'bottom-0 left-0 w-full',
    },
  }
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />
          
          {/* Drawer */}
          <motion.div
            initial={positions[position].initial}
            animate={positions[position].animate}
            exit={positions[position].exit}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`
              fixed z-50
              ${positions[position].className}
              ${sizes[size]}
              bg-white dark:bg-navy-900
              shadow-elevation-5
              overflow-y-auto
            `}
          >
            <div className="p-4">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-navy-100 dark:hover:bg-navy-800 transition-colors"
              >
                <X className="w-5 h-5 text-navy-600 dark:text-gold-400" />
              </button>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Mobile Navigation Component
interface MobileNavProps {
  items: Array<{
    label: string
    href: string
    icon?: React.ReactNode
    badge?: string | number
  }>
  currentPath: string
  onNavigate: (href: string) => void
}

export function MobileNav({ items, currentPath, onNavigate }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-30 p-4 bg-gold-500 rounded-full shadow-elevation-3 lg:hidden"
      >
        <Menu className="w-6 h-6 text-navy-900" />
      </button>
      
      {/* Mobile Navigation Drawer */}
      <MobileDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        position="bottom"
        size="md"
      >
        <nav className="space-y-2">
          {items.map((item) => {
            const isActive = currentPath === item.href
            
            return (
              <button
                key={item.href}
                onClick={() => {
                  onNavigate(item.href)
                  setIsOpen(false)
                }}
                className={`
                  w-full flex items-center justify-between px-4 py-3 rounded-lg
                  transition-all duration-200
                  ${isActive
                    ? 'bg-gold-500/20 text-gold-600 dark:text-gold-400'
                    : 'text-navy-700 dark:text-gold-300 hover:bg-navy-100 dark:hover:bg-navy-800'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  {item.icon && (
                    <span className="w-5 h-5">{item.icon}</span>
                  )}
                  <span className="font-medium">{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-2 py-1 text-xs bg-gold-500/20 text-gold-700 dark:text-gold-300 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </MobileDrawer>
    </>
  )
}

// Responsive Table Component
interface ResponsiveTableProps {
  headers: string[]
  data: Array<Record<string, any>>
  renderCell?: (key: string, value: any) => React.ReactNode
  onRowClick?: (row: any) => void
}

export function ResponsiveTable({
  headers,
  data,
  renderCell,
  onRowClick,
}: ResponsiveTableProps) {
  const { isMobile } = useBreakpoint()
  
  if (isMobile) {
    // Mobile card view
    return (
      <div className="space-y-4">
        {data.map((row, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onRowClick?.(row)}
            className={`
              bg-white dark:bg-navy-900
              border-2 border-navy-700/10 dark:border-gold-500/10
              rounded-lg p-4
              ${onRowClick ? 'cursor-pointer hover:border-gold-500/50 transition-colors' : ''}
            `}
          >
            {headers.map((header) => (
              <div key={header} className="flex justify-between py-2 border-b border-navy-100 dark:border-navy-800 last:border-0">
                <span className="text-sm font-medium text-navy-600 dark:text-gold-500">
                  {header}
                </span>
                <span className="text-sm text-navy-900 dark:text-gold-100">
                  {renderCell ? renderCell(header, row[header]) : row[header]}
                </span>
              </div>
            ))}
          </motion.div>
        ))}
      </div>
    )
  }
  
  // Desktop table view
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-gold-500/20">
            {headers.map((header) => (
              <th
                key={header}
                className="px-4 py-3 text-left text-sm font-semibold text-navy-700 dark:text-gold-300"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <motion.tr
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onRowClick?.(row)}
              className={`
                border-b border-navy-100 dark:border-navy-800
                ${onRowClick ? 'cursor-pointer hover:bg-gold-50 dark:hover:bg-navy-800/50 transition-colors' : ''}
              `}
            >
              {headers.map((header) => (
                <td
                  key={header}
                  className="px-4 py-3 text-sm text-navy-900 dark:text-gold-100"
                >
                  {renderCell ? renderCell(header, row[header]) : row[header]}
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Responsive Container Component
interface ResponsiveContainerProps {
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  padding?: boolean
  className?: string
}

export function ResponsiveContainer({
  children,
  maxWidth = 'xl',
  padding = true,
  className = '',
}: ResponsiveContainerProps) {
  const maxWidths = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    '2xl': 'max-w-screen-2xl',
    full: 'max-w-full',
  }
  
  return (
    <div className={`
      ${maxWidths[maxWidth]}
      mx-auto
      ${padding ? 'px-4 sm:px-6 lg:px-8' : ''}
      ${className}
    `}>
      {children}
    </div>
  )
}

// Responsive Carousel Component
interface ResponsiveCarouselProps {
  items: React.ReactNode[]
  itemsPerView?: {
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  gap?: number
  autoPlay?: boolean
  duration?: number
}

export function ResponsiveCarousel({
  items,
  itemsPerView = { xs: 1, sm: 2, md: 3, lg: 4 },
  gap = 16,
  autoPlay = false,
  duration = 5000,
}: ResponsiveCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const { breakpoint } = useBreakpoint()
  
  const getItemsToShow = () => {
    switch (breakpoint) {
      case 'xs': return itemsPerView.xs || 1
      case 'sm': return itemsPerView.sm || 2
      case 'md': return itemsPerView.md || 3
      case 'lg': return itemsPerView.lg || 4
      case 'xl': return itemsPerView.xl || itemsPerView.lg || 4
      default: return itemsPerView.lg || 4
    }
  }
  
  const itemsToShow = getItemsToShow()
  const maxIndex = Math.max(0, items.length - itemsToShow)
  
  useEffect(() => {
    if (!autoPlay) return
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1))
    }, duration)
    
    return () => clearInterval(interval)
  }, [autoPlay, duration, maxIndex])
  
  const handlePrev = () => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1))
  }
  
  const handleNext = () => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1))
  }
  
  return (
    <div className="relative">
      <div className="overflow-hidden">
        <motion.div
          className="flex"
          animate={{ x: `-${currentIndex * (100 / itemsToShow)}%` }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          style={{ gap }}
        >
          {items.map((item, index) => (
            <div
              key={index}
              className="flex-shrink-0"
              style={{ width: `calc(${100 / itemsToShow}% - ${gap * (itemsToShow - 1) / itemsToShow}px)` }}
            >
              {item}
            </div>
          ))}
        </motion.div>
      </div>
      
      {/* Navigation Buttons */}
      {items.length > itemsToShow && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 p-2 bg-white dark:bg-navy-900 rounded-full shadow-elevation-2 hover:shadow-elevation-3 transition-shadow"
          >
            ←
          </button>
          <button
            onClick={handleNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 p-2 bg-white dark:bg-navy-900 rounded-full shadow-elevation-2 hover:shadow-elevation-3 transition-shadow"
          >
            →
          </button>
        </>
      )}
      
      {/* Indicators */}
      <div className="flex justify-center gap-2 mt-4">
        {Array.from({ length: maxIndex + 1 }).map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`
              w-2 h-2 rounded-full transition-all duration-200
              ${index === currentIndex
                ? 'w-8 bg-gold-500'
                : 'bg-navy-300 dark:bg-navy-700 hover:bg-navy-400 dark:hover:bg-navy-600'
              }
            `}
          />
        ))}
      </div>
    </div>
  )
}