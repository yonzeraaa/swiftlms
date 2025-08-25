'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface AccessibleCardProps {
  children: ReactNode
  title?: string
  description?: string
  role?: string
  ariaLabel?: string
  ariaDescribedBy?: string
  focusable?: boolean
  onClick?: () => void
  className?: string
  variant?: 'default' | 'premium' | 'glass'
}

export default function AccessibleCard({
  children,
  title,
  description,
  role = 'article',
  ariaLabel,
  ariaDescribedBy,
  focusable = false,
  onClick,
  className = '',
  variant = 'default'
}: AccessibleCardProps) {
  const variantClasses = {
    default: 'bg-navy-800 border border-gold-500/20',
    premium: `
      bg-gradient-to-br from-navy-800 to-navy-900
      border-2 border-gold-500/40
      shadow-lg shadow-gold-500/10
      relative overflow-hidden
      before:absolute before:inset-0
      before:bg-gradient-to-r before:from-transparent before:via-gold-500/5 before:to-transparent
      before:translate-x-[-200%] hover:before:translate-x-[200%]
      before:transition-transform before:duration-1000
    `,
    glass: `
      backdrop-filter backdrop-blur-lg
      bg-navy-800/30
      border border-gold-500/30
      shadow-xl
    `
  }

  const baseClasses = `
    rounded-xl p-6
    transition-all duration-300
    ${focusable || onClick ? 'focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 focus:ring-offset-navy-950' : ''}
    ${onClick ? 'cursor-pointer hover:transform hover:scale-[1.02]' : ''}
  `

  return (
    <motion.div
      role={role}
      aria-label={ariaLabel || title}
      aria-describedby={ariaDescribedBy}
      tabIndex={focusable || onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick()
        }
      }}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      whileHover={onClick ? { y: -2 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
    >
      {title && (
        <h3 className="text-xl font-bold text-gold-500 mb-2" id={ariaDescribedBy}>
          {title}
        </h3>
      )}
      {description && (
        <p className="text-gold-300/80 mb-4" role="doc-subtitle">
          {description}
        </p>
      )}
      {children}
    </motion.div>
  )
}

// Componente de navegação acessível
export function AccessibleNav({ children, ariaLabel }: { children: ReactNode, ariaLabel: string }) {
  return (
    <nav role="navigation" aria-label={ariaLabel}>
      {children}
    </nav>
  )
}

// Skip to content link
export function SkipToContent({ href = '#main-content' }: { href?: string }) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-gold-500 text-navy-950 px-4 py-2 rounded-md font-semibold z-50"
    >
      Pular para o conteúdo principal
    </a>
  )
}

// Indicador de carregamento acessível
export function AccessibleLoader({ text = 'Carregando...' }: { text?: string }) {
  return (
    <div 
      role="status" 
      aria-live="polite" 
      aria-busy="true"
      className="flex items-center gap-2"
    >
      <div className="w-4 h-4 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      <span className="sr-only">{text}</span>
    </div>
  )
}

// Notificação acessível
export function AccessibleAlert({ 
  type = 'info', 
  message, 
  role = 'alert' 
}: { 
  type?: 'info' | 'success' | 'warning' | 'error'
  message: string
  role?: 'alert' | 'status'
}) {
  const typeClasses = {
    info: 'bg-blue-500/20 border-blue-500 text-blue-400',
    success: 'bg-green-500/20 border-green-500 text-green-400',
    warning: 'bg-yellow-500/20 border-yellow-500 text-yellow-400',
    error: 'bg-red-500/20 border-red-500 text-red-400'
  }

  return (
    <div
      role={role}
      aria-live={role === 'alert' ? 'assertive' : 'polite'}
      className={`p-4 rounded-lg border ${typeClasses[type]}`}
    >
      {message}
    </div>
  )
}