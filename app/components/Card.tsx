import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  title?: string
  subtitle?: string
  className?: string
  padding?: 'sm' | 'md' | 'lg' | 'none'
  action?: ReactNode
  hoverable?: boolean
  onClick?: () => void
  variant?: 'default' | 'gradient' | 'outlined' | 'elevated'
  glowColor?: 'gold' | 'blue' | 'green' | 'purple' | 'red'
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
  glowColor = 'gold'
}: CardProps) {
  const paddingSizes = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }

  const glowColors = {
    gold: 'rgba(255,215,0,0.15)',
    blue: 'rgba(59,130,246,0.15)',
    green: 'rgba(34,197,94,0.15)',
    purple: 'rgba(168,85,247,0.15)',
    red: 'rgba(239,68,68,0.15)'
  }

  const variants = {
    default: `
      bg-navy-800/90 
      border border-gold-500/20 
      hover:border-gold-500/30
      shadow-[0_4px_20px_${glowColors[glowColor]}]
      hover:shadow-[0_8px_30px_${glowColors[glowColor]}]
    `,
    gradient: `
      bg-gradient-to-br from-navy-800/95 via-navy-800/90 to-navy-900/95
      border border-transparent
      bg-clip-padding
      before:absolute before:inset-0 before:rounded-2xl
      before:bg-gradient-to-br before:from-gold-500/20 before:to-gold-600/10
      before:-z-10 before:blur-xl
      shadow-[0_4px_24px_${glowColors[glowColor]}]
      hover:shadow-[0_8px_32px_${glowColors[glowColor]}]
    `,
    outlined: `
      bg-transparent
      border-2 border-gold-500/30
      hover:border-gold-500/50
      hover:bg-navy-800/20
      backdrop-blur-sm
    `,
    elevated: `
      bg-navy-800/95
      border border-gold-500/10
      shadow-[0_10px_40px_rgba(0,0,0,0.3)]
      hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)]
      hover:border-gold-500/20
    `
  }

  const handleClick = onClick && !hoverable ? undefined : onClick

  return (
    <div 
      className={`
        relative rounded-2xl
        transform transition-all duration-300 ease-out
        ${hoverable ? 'hover:-translate-y-1 hover:scale-[1.02] cursor-pointer' : ''}
        ${variants[variant]}
        ${className}
      `}
      onClick={handleClick}
    >
      {variant === 'gradient' && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-gold-500/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      )}
      
      <div className={`
        relative rounded-2xl
        transition-all duration-300
        ${paddingSizes[padding]}
      `}>
        {(title || subtitle || action) && (
          <div className="mb-4">
            <div className="flex justify-between items-start">
              <div>
                {title && (
                  <h3 className="text-xl font-bold bg-gradient-to-r from-gold to-gold-300 bg-clip-text text-transparent">
                    {title}
                  </h3>
                )}
                {subtitle && <p className="text-sm text-gold-300/80 mt-1">{subtitle}</p>}
              </div>
              {action && <div className="transition-transform hover:scale-105">{action}</div>}
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}