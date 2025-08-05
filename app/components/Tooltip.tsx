'use client'

import { ReactNode, useState, useRef, useEffect } from 'react'

interface TooltipProps {
  children: ReactNode
  content: string | ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
  className?: string
}

export default function Tooltip({
  children,
  content,
  position = 'top',
  delay = 300,
  className = ''
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect()
      const tooltipRect = tooltipRef.current.getBoundingClientRect()
      
      let top = 0
      let left = 0

      switch (position) {
        case 'top':
          top = triggerRect.top - tooltipRect.height - 8
          left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2
          break
        case 'bottom':
          top = triggerRect.bottom + 8
          left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2
          break
        case 'left':
          top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2
          left = triggerRect.left - tooltipRect.width - 8
          break
        case 'right':
          top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2
          left = triggerRect.right + 8
          break
      }

      // Ensure tooltip stays within viewport
      const padding = 8
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      if (left < padding) left = padding
      if (left + tooltipRect.width > viewportWidth - padding) {
        left = viewportWidth - tooltipRect.width - padding
      }
      if (top < padding) top = padding
      if (top + tooltipRect.height > viewportHeight - padding) {
        top = viewportHeight - tooltipRect.height - padding
      }

      setTooltipPosition({ top, left })
    }
  }, [isVisible, position])

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
    }, delay)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  const getArrowClass = () => {
    const baseClass = 'absolute w-0 h-0 border-solid'
    const arrowSize = 'border-[6px]'
    
    switch (position) {
      case 'top':
        return `${baseClass} ${arrowSize} -bottom-3 left-1/2 -translate-x-1/2 border-t-navy-800 border-x-transparent border-b-transparent`
      case 'bottom':
        return `${baseClass} ${arrowSize} -top-3 left-1/2 -translate-x-1/2 border-b-navy-800 border-x-transparent border-t-transparent`
      case 'left':
        return `${baseClass} ${arrowSize} -right-3 top-1/2 -translate-y-1/2 border-l-navy-800 border-y-transparent border-r-transparent`
      case 'right':
        return `${baseClass} ${arrowSize} -left-3 top-1/2 -translate-y-1/2 border-r-navy-800 border-y-transparent border-l-transparent`
      default:
        return ''
    }
  }

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-block"
      >
        {children}
      </div>

      {isVisible && (
        <div
          ref={tooltipRef}
          style={{
            position: 'fixed',
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            zIndex: 9999
          }}
          className={`
            pointer-events-none
            animate-in fade-in zoom-in-95
            ${className}
          `}
        >
          <div className="relative">
            <div className="
              bg-navy-800 text-gold-100 
              px-3 py-2 rounded-lg
              text-sm font-medium
              shadow-xl border border-gold-500/20
              max-w-xs
            ">
              {content}
            </div>
            <div className={getArrowClass()} />
          </div>
        </div>
      )}
    </>
  )
}