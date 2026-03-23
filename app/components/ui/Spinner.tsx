'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { SwiftMark } from './RenaissanceSvgs'

type SpinnerProps = {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  colorClass?: string // Mantido para compatibilidade, mas ignorado no novo design
  fullPage?: boolean
}

const sizeMap: Record<NonNullable<SpinnerProps['size']>, number> = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
}

const ACCENT = '#8b6d22'
const INK = '#1e130c'

export default function Spinner({ size = 'md', className = '', fullPage = false }: SpinnerProps) {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  const pixelSize = sizeMap[size]
  
  const spinnerContent = (
    <div
      aria-label="Carregando"
      role="status"
      className={`relative flex items-center justify-center ${!fullPage ? className : ''}`}
      style={{ width: pixelSize, height: pixelSize }}
    >
      {/* Círculo de Tinta Giratório */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 animate-renaissance-rotate"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke={ACCENT}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="264"
          className="animate-ink-draw"
          style={{ opacity: 0.6 }}
        />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke={INK}
          strokeWidth="0.5"
          strokeDasharray="4 8"
          opacity="0.2"
        />
      </svg>

      {/* Ícone SwiftMark Central */}
      <div 
        className="relative z-10 animate-scroll-pulse"
        style={{ width: pixelSize * 0.5, color: INK }}
      >
        <SwiftMark />
      </div>
    </div>
  )

  if (fullPage) {
    if (!mounted) return null

    return createPortal(
      <div 
        className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#faf6ee]/85 backdrop-blur-md ${className}`}
        style={{ width: '100vw', height: '100vh', left: 0, top: 0 }}
      >
        <div className="relative flex flex-col items-center">
          {spinnerContent}
          <p 
            className="mt-10 font-[family-name:var(--font-playfair)] italic text-[#1e130c] animate-pulse tracking-[0.4em] text-sm uppercase"
            style={{ textShadow: '0 0 20px rgba(139,109,34,0.1)' }}
          >
            Consultando Registros
          </p>
          <div className="mt-6 w-48 h-px bg-gradient-to-r from-transparent via-[#8b6d22]/40 to-transparent" />
        </div>
      </div>,
      document.body
    )
  }

  return spinnerContent
}
