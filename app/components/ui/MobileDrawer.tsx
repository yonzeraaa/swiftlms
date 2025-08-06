'use client'

import { useEffect, useRef, useState, TouchEvent } from 'react'
import { X } from 'lucide-react'
import { useFocusTrap } from './AccessibilityEnhancements'

interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
  position?: 'left' | 'right'
  children: React.ReactNode
  title?: string
  showCloseButton?: boolean
  swipeToClose?: boolean
  overlay?: boolean
  overlayOpacity?: number
  width?: string
  className?: string
}

export default function MobileDrawer({
  isOpen,
  onClose,
  position = 'left',
  children,
  title,
  showCloseButton = true,
  swipeToClose = true,
  overlay = true,
  overlayOpacity = 0.5,
  width = '80%',
  className = ''
}: MobileDrawerProps) {
  const drawerRef = useRef<HTMLElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragDistance, setDragDistance] = useState(0)
  const [startX, setStartX] = useState(0)
  
  // Use focus trap for accessibility
  useFocusTrap(isOpen, drawerRef)

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      document.body.style.touchAction = 'none'
    } else {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }

    return () => {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }
  }, [isOpen])

  // Touch handlers for swipe to close
  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (!swipeToClose) return
    setIsDragging(true)
    setStartX(e.touches[0].clientX)
  }

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (!isDragging || !swipeToClose) return
    
    const currentX = e.touches[0].clientX
    const distance = currentX - startX
    
    // Only allow dragging in the closing direction
    if (position === 'left' && distance < 0) {
      setDragDistance(Math.max(distance, -300))
    } else if (position === 'right' && distance > 0) {
      setDragDistance(Math.min(distance, 300))
    }
  }

  const handleTouchEnd = () => {
    if (!isDragging || !swipeToClose) return
    
    setIsDragging(false)
    
    // Close if dragged more than 100px
    const threshold = 100
    if (Math.abs(dragDistance) > threshold) {
      onClose()
    }
    
    setDragDistance(0)
  }

  const drawerStyles = {
    left: {
      base: 'left-0',
      translate: isOpen ? 'translate-x-0' : '-translate-x-full',
      dragTransform: `translateX(${dragDistance}px)`
    },
    right: {
      base: 'right-0',
      translate: isOpen ? 'translate-x-0' : 'translate-x-full',
      dragTransform: `translateX(${dragDistance}px)`
    }
  }

  const currentStyles = drawerStyles[position]

  return (
    <>
      {/* Overlay */}
      {overlay && (
        <div
          className={`
            fixed inset-0 bg-navy-900 transition-opacity duration-300 z-40
            ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
          `}
          style={{ opacity: isOpen ? overlayOpacity : 0 }}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        ref={drawerRef as React.RefObject<HTMLDivElement>}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Menu lateral'}
        className={`
          fixed top-0 ${currentStyles.base} h-full z-50
          bg-navy-900/95 backdrop-blur-lg border-${position === 'left' ? 'r' : 'l'} border-gold-500/30
          transform ${currentStyles.translate} transition-transform duration-300 ease-out
          ${isDragging ? '' : 'transition-transform'}
          ${className}
        `}
        style={{
          width,
          transform: isDragging ? currentStyles.dragTransform : undefined,
          maxWidth: '100vw'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-4 border-b border-gold-500/20">
            {title && (
              <h2 className="text-lg font-bold text-gold">{title}</h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 text-gold-400 hover:text-gold-200 hover:bg-gold-500/10 rounded-lg transition-all duration-200
                          focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 focus:ring-offset-navy-900"
                aria-label="Fechar menu"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>

        {/* Swipe indicator */}
        {swipeToClose && (
          <div 
            className={`
              absolute top-1/2 -translate-y-1/2 w-1 h-20 bg-gold-500/30 rounded-full
              ${position === 'left' ? 'right-2' : 'left-2'}
            `}
            aria-hidden="true"
          />
        )}
      </div>
    </>
  )
}

// Hook for managing drawer state
export function useDrawer(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState)

  const open = () => setIsOpen(true)
  const close = () => setIsOpen(false)
  const toggle = () => setIsOpen(prev => !prev)

  return {
    isOpen,
    open,
    close,
    toggle
  }
}

// Animated hamburger menu icon
interface HamburgerButtonProps {
  isOpen: boolean
  onClick: () => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function HamburgerButton({ 
  isOpen, 
  onClick, 
  className = '',
  size = 'md'
}: HamburgerButtonProps) {
  const sizes = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  return (
    <button
      onClick={onClick}
      className={`relative p-2 text-gold-400 hover:text-gold-200 hover:bg-gold-500/10 rounded-lg transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 focus:ring-offset-navy-900 ${className}`}
      aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'}
      aria-expanded={isOpen}
    >
      <div className={`${sizes[size]} relative`}>
        <span
          className={`
            absolute left-0 top-0 h-0.5 w-full bg-current transform transition-all duration-300
            ${isOpen ? 'rotate-45 translate-y-2.5' : 'translate-y-0'}
          `}
        />
        <span
          className={`
            absolute left-0 top-1/2 h-0.5 w-full bg-current transform -translate-y-1/2 transition-all duration-300
            ${isOpen ? 'opacity-0 scale-x-0' : 'opacity-100 scale-x-100'}
          `}
        />
        <span
          className={`
            absolute left-0 bottom-0 h-0.5 w-full bg-current transform transition-all duration-300
            ${isOpen ? '-rotate-45 -translate-y-2.5' : 'translate-y-0'}
          `}
        />
      </div>
    </button>
  )
}

// Swipeable tab indicator for mobile navigation
interface SwipeableTabsProps {
  tabs: Array<{
    id: string
    label: string
    icon?: React.ReactNode
  }>
  activeTab: string
  onTabChange: (tabId: string) => void
  className?: string
}

export function SwipeableTabs({
  tabs,
  activeTab,
  onTabChange,
  className = ''
}: SwipeableTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setStartX(e.pageX - (containerRef.current?.offsetLeft || 0))
    setScrollLeft(containerRef.current?.scrollLeft || 0)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return
    e.preventDefault()
    const x = e.pageX - (containerRef.current.offsetLeft || 0)
    const walk = (x - startX) * 2
    containerRef.current.scrollLeft = scrollLeft - walk
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
  }

  return (
    <div
      ref={containerRef}
      className={`
        flex gap-2 overflow-x-auto scrollbar-hide pb-2
        ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
        ${className}
      `}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all duration-200
            ${activeTab === tab.id
              ? 'bg-gold-500/20 text-gold border border-gold-500/30'
              : 'text-gold-300 hover:text-gold-100 hover:bg-gold-500/10'
            }
          `}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  )
}