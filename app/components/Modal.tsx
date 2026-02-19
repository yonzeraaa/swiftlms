'use client'

import { ReactNode, useEffect, useRef } from 'react'
import { X, Minimize2 } from 'lucide-react'
import Button from './Button'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showCloseButton?: boolean
  closeOnBackdrop?: boolean
  closeOnEscape?: boolean
  className?: string
  footer?: ReactNode
  onMinimize?: () => void
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  className = '',
  footer,
  onMinimize,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape || !isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [closeOnEscape, isOpen, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Focus trap
  useEffect(() => {
    if (!isOpen) return

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !modalRef.current) return

      const focusableElements = modalRef.current.querySelectorAll(
        'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
      )
      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

      if (e.shiftKey && document.activeElement === firstElement) {
        lastElement.focus()
        e.preventDefault()
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        firstElement.focus()
        e.preventDefault()
      }
    }

    document.addEventListener('keydown', handleTabKey)
    return () => document.removeEventListener('keydown', handleTabKey)
  }, [isOpen])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose()
    }
  }

  const sizeClasses = {
    sm: 'max-w-sm sm:max-w-md mx-4 sm:mx-auto',
    md: 'max-w-full sm:max-w-lg mx-4 sm:mx-auto',
    lg: 'max-w-full sm:max-w-xl md:max-w-2xl mx-4 sm:mx-auto',
    xl: 'max-w-full sm:max-w-2xl md:max-w-4xl mx-4 sm:mx-auto',
    full: 'max-w-full mx-4'
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-out"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={modalRef}
          className={`
            relative w-full ${sizeClasses[size]} 
            transform transition-all duration-300 ease-out
            animate-in fade-in zoom-in-95
            ${className}
          `}
        >
          <div className="relative bg-navy-800 rounded-2xl shadow-2xl border border-gold-500/20 overflow-hidden">
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-center p-4 sm:p-6 border-b border-gold-500/20 relative">
                {title && (
                  <h2 id="modal-title" className="text-lg sm:text-xl md:text-2xl font-bold text-gold text-center">
                    {title}
                  </h2>
                )}
                {showCloseButton && (
                  <div className="absolute right-4 sm:right-6 flex items-center gap-1">
                    {onMinimize && (
                      <button
                        onClick={onMinimize}
                        className="text-gold-400 hover:text-gold-200 transition-colors p-1 rounded-lg hover:bg-gold-500/10"
                        aria-label="Minimizar"
                        title="Minimizar"
                      >
                        <Minimize2 className="w-5 h-5 sm:w-5 sm:h-5" />
                      </button>
                    )}
                    <button
                      onClick={onClose}
                      className="text-gold-400 hover:text-gold-200 transition-colors p-1 rounded-lg hover:bg-gold-500/10"
                      aria-label="Fechar"
                    >
                      <X className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Body */}
            <div className="p-4 sm:p-6 max-h-[calc(100vh-100px)] sm:max-h-[calc(100vh-200px)] overflow-y-auto">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="p-4 sm:p-6 border-t border-gold-500/20 bg-navy-900/50">
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Animation keyframes for Tailwind
const animationStyles = `
@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes zoom-in-95 {
  from {
    transform: scale(0.95);
  }
  to {
    transform: scale(1);
  }
}

.animate-in {
  animation-duration: 200ms;
  animation-fill-mode: both;
}

.fade-in {
  animation-name: fade-in;
}

.zoom-in-95 {
  animation-name: zoom-in-95;
}
`

// Export animation styles to be included in global CSS
export { animationStyles }