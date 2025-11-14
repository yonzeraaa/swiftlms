'use client'

import { ReactNode, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { hoverLift, tapScale } from '../lib/animations'

interface CardProps {
  children: ReactNode
  title?: string
  subtitle?: string
  className?: string
  padding?: 'sm' | 'md' | 'lg' | 'xl' | 'none'
  action?: ReactNode
  hoverable?: boolean
  onClick?: () => void
  variant?: 'default' | 'gradient' | 'outlined' | 'elevated' | 'glass'
  animate?: boolean
  delay?: number
  depth?: 1 | 2 | 3 | 4 | 5
}

export default function Card({
  children,
  title,
  subtitle,
  className = '',
  padding = 'md',
  action,
  hoverable = false,
  onClick,
  variant = 'default',
  animate = false,
  delay = 0,
  depth = 2
}: CardProps) {

  const paddingSizes = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10'
  }

  const glowColors = {
    gold: 'rgba(255,215,0,0.15)',
    blue: 'rgba(59,130,246,0.15)',
    green: 'rgba(34,197,94,0.15)',
    purple: 'rgba(168,85,247,0.15)',
    red: 'rgba(239,68,68,0.15)'
  }

  const depthStyles = {
    1: 'card-depth-1',
    2: 'card-depth-2',
    3: 'card-depth-3',
    4: 'card-depth-4',
    5: 'card-depth-5'
  }

  const variants = {
    default: `
      bg-navy-800/95
      border border-gold-500/20
      ${hoverable ? 'hover:border-gold-500/30 hover:shadow-md transition-all duration-200' : ''}
    `,
    gradient: `
      bg-navy-800/95
      border border-gold-500/25
      ${hoverable ? 'hover:border-gold-500/40 hover:shadow-md transition-all duration-200' : ''}
    `,
    outlined: `
      bg-navy-900/80 border border-gold-500/25
      ${hoverable ? 'hover:bg-navy-800/80 hover:border-gold-500/40 transition-all duration-200' : ''}
    `,
    elevated: `
      bg-navy-800
      border border-gold-500/10
      shadow-md
      ${hoverable ? 'hover:shadow-lg transition-shadow duration-200' : ''}
    `,
    glass: `
      bg-navy-800/80 backdrop-blur-sm border border-gold-500/20
      ${hoverable ? 'hover:bg-navy-800/90 hover:border-gold-500/30 transition-all duration-200' : ''}
    `
  }

  const cardContent = (
    <>
      {/* Card Header */}
      {(title || action) && (
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && (
              <h3 className="text-xl font-bold text-gold">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-gold-300 mt-1">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}

      {/* Card Content */}
      <div className="relative z-10">
        {children}
      </div>
    </>
  )

  return (
    <motion.div
      className={`
        ${variants[variant]}
        ${paddingSizes[padding]}
        ${depthStyles[depth]}
        rounded-xl relative
        ${onClick ? 'cursor-pointer' : ''}
        transition-all duration-200 ease-out
        ${className}
      `}
      onClick={onClick}
      initial={animate ? { opacity: 0, y: 20 } : false}
      animate={animate ? { opacity: 1, y: 0 } : false}
      transition={{ delay, duration: 0.5, ease: 'easeOut' }}
    >
      {cardContent}
    </motion.div>
  )
}

// Glass Card variant for specific use case
export function GlassCard({ children, className = '', ...props }: CardProps) {
  return (
    <Card variant="glass" className={className} {...props}>
      {children}
    </Card>
  )
}