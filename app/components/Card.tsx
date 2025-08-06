'use client'

import { ReactNode, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { morphingCard, hoverLift, tapScale } from '../lib/animations'

interface CardProps {
  children: ReactNode
  title?: string
  subtitle?: string
  className?: string
  padding?: 'sm' | 'md' | 'lg' | 'xl' | 'none'
  action?: ReactNode
  hoverable?: boolean
  onClick?: () => void
  variant?: 'default' | 'gradient' | 'outlined' | 'elevated' | 'glass' | 'interactive' | 'premium' | 'holographic'
  glowColor?: 'gold' | 'blue' | 'green' | 'purple' | 'red'
  animate?: boolean
  delay?: number
  pulse?: boolean
  depth?: 1 | 2 | 3 | 4 | 5
  backgroundPattern?: boolean
  iridescent?: boolean
  flipCard?: boolean
  backContent?: ReactNode
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
  glowColor = 'gold',
  animate = false,
  delay = 0,
  pulse = false,
  depth = 2,
  backgroundPattern = false,
  iridescent = false,
  flipCard = false,
  backContent
}: CardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

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
      bg-gradient-to-br from-navy-800/90 to-navy-900/90 
      border border-gold-500/20 backdrop-blur-md
      ${hoverable ? 'hover:border-gold-500/40 hover-lift' : ''}
    `,
    gradient: `
      bg-gradient-to-br from-gold-500/10 via-navy-800/90 to-navy-900/90 
      border border-gold-500/30 backdrop-blur-md
      ${hoverable ? 'hover:border-gold-500/50 hover:from-gold-500/20 hover-lift' : ''}
    `,
    outlined: `
      bg-navy-900/50 border-2 border-gold-500/30 backdrop-blur-sm
      ${hoverable ? 'hover:bg-navy-800/50 hover:border-gold-500/50 hover-lift' : ''}
    `,
    elevated: `
      bg-gradient-to-br from-navy-700 to-navy-800 
      border border-gold-500/10
      ${hoverable ? 'hover:shadow-2xl hover-lift' : ''}
    `,
    glass: `
      glass border border-gold-500/20
      ${hoverable ? 'hover:bg-white/10 hover:border-gold-500/40 hover-lift' : ''}
    `,
    interactive: `
      bg-gradient-to-br from-navy-800/80 to-navy-900/80 
      border border-gold-500/30 backdrop-blur-lg
      transform transition-all duration-300
      ${hoverable ? 'hover:scale-105 hover:border-gold-500/60 hover:shadow-2xl' : ''}
    `,
    premium: `
      bg-gradient-to-br from-navy-800/95 via-navy-850/95 to-navy-900/95
      border border-gold-500/30 backdrop-blur-xl
      relative overflow-hidden
      ${hoverable ? 'hover:border-gold-500/60 hover-scale' : ''}
    `,
    holographic: `
      bg-gradient-to-br from-navy-800/90 to-navy-900/90
      border border-transparent backdrop-blur-xl
      relative overflow-hidden
      ${hoverable ? 'hover-scale' : ''}
    `
  }

  const cardContent = (
    <>
      {/* Background Pattern */}
      {backgroundPattern && (
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-repeat" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23FFD700' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '30px 30px'
          }} />
        </div>
      )}

      {/* Holographic/Iridescent Effect */}
      {(variant === 'holographic' || iridescent) && (
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div 
            className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 20%, #f093fb 40%, #f5576c 60%, #ffd700 80%, #667eea 100%)',
              filter: 'blur(40px)',
              transform: isHovered ? 'scale(1.1)' : 'scale(1)',
              transition: 'transform 0.5s ease'
            }}
          />
        </div>
      )}

      {/* Noise Texture */}
      {variant === 'premium' && <div className="noise-texture" />}

      {/* Card Header */}
      {(title || action) && (
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && (
              <h3 className="text-xl font-bold text-gold gradient-text">
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

      {/* Glow Effect */}
      {pulse && (
        <div 
          className="absolute inset-0 rounded-xl pointer-events-none glow-pulse"
          style={{ boxShadow: `0 0 40px ${glowColors[glowColor]}` }}
        />
      )}
    </>
  )

  // Flip Card Implementation
  if (flipCard && backContent) {
    return (
      <motion.div
        className={`relative ${paddingSizes[padding]} ${className}`}
        style={{ perspective: 1000 }}
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <motion.div
          className={`
            ${variants[variant]} 
            ${depthStyles[depth]}
            rounded-xl relative
            ${onClick ? 'cursor-pointer' : ''}
            transition-all-premium
            w-full h-full
          `}
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(0deg)'
          }}
        >
          {cardContent}
        </motion.div>
        
        <motion.div
          className={`
            ${variants[variant]} 
            ${depthStyles[depth]}
            rounded-xl absolute inset-0
            ${paddingSizes[padding]}
          `}
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          {backContent}
        </motion.div>
      </motion.div>
    )
  }

  return (
    <motion.div
      className={`
        ${variants[variant]} 
        ${paddingSizes[padding]} 
        ${depthStyles[depth]}
        rounded-xl relative
        ${onClick ? 'cursor-pointer' : ''}
        transition-all-premium
        ${className}
      `}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={animate ? { opacity: 0, y: 20 } : false}
      animate={animate ? { opacity: 1, y: 0 } : false}
      transition={{ delay, duration: 0.5, ease: 'easeOut' }}
      whileHover={hoverable ? hoverLift : undefined}
      whileTap={onClick ? tapScale : undefined}
      style={{
        boxShadow: pulse ? `0 0 40px ${glowColors[glowColor]}` : undefined
      }}
    >
      {cardContent}
    </motion.div>
  )
}

// Premium Card Variants for specific use cases
export function GlassCard({ children, className = '', ...props }: CardProps) {
  return (
    <Card variant="glass" className={`glass-heavy ${className}`} {...props}>
      {children}
    </Card>
  )
}

export function PremiumCard({ children, className = '', ...props }: CardProps) {
  return (
    <Card 
      variant="premium" 
      backgroundPattern 
      depth={4}
      className={className} 
      {...props}
    >
      {children}
    </Card>
  )
}

export function HolographicCard({ children, className = '', ...props }: CardProps) {
  return (
    <Card 
      variant="holographic" 
      iridescent
      depth={5}
      className={`border-iridescent ${className}`} 
      {...props}
    >
      {children}
    </Card>
  )
}

export function InteractiveCard({ children, className = '', ...props }: CardProps) {
  return (
    <Card 
      variant="interactive" 
      hoverable
      depth={3}
      className={className} 
      {...props}
    >
      {children}
    </Card>
  )
}