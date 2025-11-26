'use client'

import React from 'react'

type SpinnerProps = {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  colorClass?: string // border color class, default gold
}

const sizeClasses: Record<NonNullable<SpinnerProps['size']>, string> = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
}

export default function Spinner({ size = 'md', className = '', colorClass = 'border-gold-500' }: SpinnerProps) {
  return (
    <div
      aria-label="Carregando"
      role="status"
      className={`animate-spin rounded-full ${sizeClasses[size]} border-2 ${colorClass} border-t-transparent ${className}`}
    />
  )
}

