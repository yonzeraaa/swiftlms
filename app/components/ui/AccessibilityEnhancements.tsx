'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

// Skip to main content link
export function SkipToMain() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] 
                 bg-gold-500 text-navy-900 px-4 py-2 rounded-lg font-semibold
                 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 focus:ring-offset-navy-900"
    >
      Pular para o conteúdo principal
    </a>
  )
}

// Announce route changes for screen readers
export function RouteAnnouncer() {
  const pathname = usePathname()
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    const pageTitle = document.title
    const message = `Navegou para ${pageTitle}`
    setAnnouncement(message)
  }, [pathname])

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  )
}

// Focus trap hook for modals and drawers
export function useFocusTrap(isActive: boolean, containerRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
    )
    
    const firstFocusable = focusableElements[0]
    const lastFocusable = focusableElements[focusableElements.length - 1]

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault()
          lastFocusable?.focus()
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault()
          firstFocusable?.focus()
        }
      }
    }

    // Focus first element when trap activates
    firstFocusable?.focus()

    container.addEventListener('keydown', handleTabKey)
    return () => container.removeEventListener('keydown', handleTabKey)
  }, [isActive, containerRef])
}

// Enhanced focus indicator styles
export const focusRingStyles = {
  gold: 'focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 focus:ring-offset-navy-900',
  blue: 'focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-navy-900',
  green: 'focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-navy-900',
  red: 'focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-navy-900',
  purple: 'focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-navy-900'
}

// Keyboard navigation indicator
export function KeyboardNavigationIndicator() {
  const [isKeyboardNav, setIsKeyboardNav] = useState(false)

  useEffect(() => {
    const handleMouseDown = () => setIsKeyboardNav(false)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') setIsKeyboardNav(true)
    }

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    if (isKeyboardNav) {
      document.body.classList.add('keyboard-navigation')
    } else {
      document.body.classList.remove('keyboard-navigation')
    }
  }, [isKeyboardNav])

  return null
}

// Live region for dynamic content updates
interface LiveRegionProps {
  message: string
  type?: 'polite' | 'assertive'
  className?: string
}

export function LiveRegion({ message, type = 'polite', className = '' }: LiveRegionProps) {
  return (
    <div
      role="status"
      aria-live={type}
      aria-atomic="true"
      className={`sr-only ${className}`}
    >
      {message}
    </div>
  )
}

// Loading announcement
export function LoadingAnnouncement({ isLoading }: { isLoading: boolean }) {
  return (
    <LiveRegion 
      message={isLoading ? 'Carregando conteúdo...' : 'Conteúdo carregado'} 
      type="polite"
    />
  )
}

// Form validation announcements
interface ValidationAnnouncementProps {
  errors: string[]
  fieldName: string
}

export function ValidationAnnouncement({ errors, fieldName }: ValidationAnnouncementProps) {
  if (errors.length === 0) return null

  const message = `${fieldName} tem ${errors.length} erro${errors.length > 1 ? 's' : ''}: ${errors.join(', ')}`
  
  return <LiveRegion message={message} type="assertive" />
}

// Accessible tooltip
interface AccessibleTooltipProps {
  content: string
  children: React.ReactNode
  id: string
}

export function AccessibleTooltip({ content, children, id }: AccessibleTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        aria-describedby={id}
      >
        {children}
      </div>
      {isVisible && (
        <div
          id={id}
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 
                     bg-navy-800 text-gold-200 text-sm rounded-lg whitespace-nowrap
                     border border-gold-500/30 shadow-lg z-50"
        >
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="border-4 border-transparent border-t-navy-800" />
          </div>
        </div>
      )}
    </div>
  )
}

// Screen reader only text
export function ScreenReaderOnly({ children }: { children: React.ReactNode }) {
  return <span className="sr-only">{children}</span>
}

// Accessible icon button
interface AccessibleIconButtonProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function AccessibleIconButton({
  icon,
  label,
  onClick,
  variant = 'ghost',
  size = 'md',
  className = ''
}: AccessibleIconButtonProps) {
  const sizes = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3'
  }

  const variants = {
    primary: 'bg-gold-500 text-navy-900 hover:bg-gold-600',
    secondary: 'bg-navy-700 text-gold-200 hover:bg-navy-600',
    ghost: 'text-gold-300 hover:bg-gold-500/10 hover:text-gold-100'
  }

  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`
        ${sizes[size]} ${variants[variant]}
        rounded-lg transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 focus:ring-offset-navy-900
        ${className}
      `}
    >
      {icon}
      <ScreenReaderOnly>{label}</ScreenReaderOnly>
    </button>
  )
}

// Accessible progress indicator
interface AccessibleProgressProps {
  value: number
  max: number
  label: string
  showLabel?: boolean
  className?: string
}

export function AccessibleProgress({
  value,
  max,
  label,
  showLabel = true,
  className = ''
}: AccessibleProgressProps) {
  const percentage = Math.round((value / max) * 100)

  return (
    <div className={className}>
      {showLabel && (
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gold-300">{label}</span>
          <span className="text-sm text-gold-400">{percentage}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
        className="w-full h-2 bg-navy-800 rounded-full overflow-hidden"
      >
        <div
          className="h-full bg-gradient-to-r from-gold-500 to-gold-600 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <ScreenReaderOnly>
        {value} de {max} completo
      </ScreenReaderOnly>
    </div>
  )
}

// Focus visible utilities for better keyboard navigation
export const focusVisibleStyles = `
  .focus-visible:focus {
    outline: 2px solid #FFD700;
    outline-offset: 2px;
  }
  
  .keyboard-navigation *:focus {
    outline: 2px solid #FFD700 !important;
    outline-offset: 2px !important;
  }
  
  .keyboard-navigation button:focus,
  .keyboard-navigation a:focus,
  .keyboard-navigation input:focus,
  .keyboard-navigation textarea:focus,
  .keyboard-navigation select:focus {
    box-shadow: 0 0 0 3px rgba(255, 215, 0, 0.3);
  }
`

// Add these styles to your global CSS
export function injectAccessibilityStyles() {
  if (typeof document === 'undefined') return
  
  const style = document.createElement('style')
  style.innerHTML = focusVisibleStyles
  document.head.appendChild(style)
}