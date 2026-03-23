'use client'

import { ReactNode, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { ClassicRule, CornerBracket } from './ui/RenaissanceSvgs'

const INK = '#1e130c'
const PARCH = '#faf6ee'
const BORDER = 'rgba(30,19,12,0.12)'

const sizeMaxWidths = {
  sm: 420,
  md: 560,
  lg: 720,
  xl: 960,
  full: undefined,
}

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
  footer,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!closeOnEscape || !isOpen) return
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [closeOnEscape, isOpen, onClose])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset'
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !modalRef.current) return
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
      )
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault() }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault() }
    }
    document.addEventListener('keydown', handleTab)
    return () => document.removeEventListener('keydown', handleTab)
  }, [isOpen])

  if (!isOpen) return null

  const hasHeader = !!(title || showCloseButton)
  const maxW = sizeMaxWidths[size]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        overflowY: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={closeOnBackdrop ? onClose : undefined}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(30,19,12,0.45)',
        }}
      />

      {/* Panel */}
      <div
        ref={modalRef}
        style={{
          position: 'relative',
          backgroundColor: PARCH,
          border: `1px solid ${BORDER}`,
          boxShadow: '0 8px 40px rgba(30,19,12,0.18)',
          width: '100%',
          maxWidth: maxW,
          maxHeight: 'calc(100vh - 2rem)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'modal-in 0.22s ease-out',
        }}
      >
        {/* Corner brackets */}
        <div style={{ position: 'absolute', top: 0, left: 0 }}>
          <CornerBracket size={28} />
        </div>
        <div style={{ position: 'absolute', top: 0, right: 0, transform: 'scaleX(-1)' }}>
          <CornerBracket size={28} />
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, transform: 'scaleY(-1)' }}>
          <CornerBracket size={28} />
        </div>
        <div style={{ position: 'absolute', bottom: 0, right: 0, transform: 'scale(-1)' }}>
          <CornerBracket size={28} />
        </div>

        {/* Header */}
        {hasHeader && (
          <div style={{ padding: '1.25rem 1.5rem 0', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', minHeight: 32 }}>
              {title && (
                <h2
                  id="modal-title"
                  style={{
                    fontFamily: 'var(--font-playfair, serif)',
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    color: INK,
                    margin: 0,
                    textAlign: 'center',
                    flex: 1,
                  }}
                >
                  {title}
                </h2>
              )}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  aria-label="Fechar"
                  style={{
                    position: 'absolute',
                    right: 0,
                    color: 'rgba(30,19,12,0.45)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = INK }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(30,19,12,0.45)' }}
                >
                  <X size={18} />
                </button>
              )}
            </div>
            <div style={{ marginTop: '0.875rem' }}>
              <ClassicRule />
            </div>
          </div>
        )}

        {/* Body */}
        <div
          style={{
            padding: hasHeader ? '1rem 1.5rem 1.25rem' : '1.5rem',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            style={{
              padding: '1rem 1.5rem',
              borderTop: `1px solid ${BORDER}`,
              flexShrink: 0,
            }}
          >
            {footer}
          </div>
        )}
      </div>

      <style>{`
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.97) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
      `}</style>
    </div>
  )
}

// Kept for backwards-compatibility with any import of animationStyles
export const animationStyles = ''
