import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  title?: string
  subtitle?: string
  className?: string
  padding?: 'sm' | 'md' | 'lg' | 'xl' | 'none'
  action?: ReactNode
  hoverable?: boolean
  onClick?: () => void
  variant?: 'default' | 'gradient' | 'outlined' | 'elevated' | 'glass' | 'interactive'
  glowColor?: 'gold' | 'blue' | 'green' | 'purple' | 'red'
  animate?: boolean
  delay?: number
  pulse?: boolean
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
  pulse = false
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

  const variants = {
    default: `
      bg-navy-800/90 
      border border-gold-500/20 
      hover:border-gold-500/30
      shadow-[0_4px_20px_${glowColors[glowColor]}]
      hover:shadow-[0_8px_30px_${glowColors[glowColor]}]
      before:absolute before:inset-0 before:rounded-2xl before:opacity-0
      before:bg-gradient-to-br before:from-gold-500/5 before:to-transparent
      before:transition-opacity before:duration-300
      hover:before:opacity-100
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
      after:absolute after:inset-0 after:rounded-2xl after:opacity-0
      after:bg-gradient-to-tr after:from-transparent after:via-gold-500/10 after:to-transparent
      after:transition-opacity after:duration-500
      hover:after:opacity-100
    `,
    outlined: `
      bg-transparent
      border-2 border-gold-500/30
      hover:border-gold-500/50
      hover:bg-navy-800/20
      backdrop-blur-sm
      before:absolute before:inset-0 before:rounded-2xl before:opacity-0
      before:bg-gradient-to-br before:from-gold-500/5 before:to-transparent
      before:transition-opacity before:duration-300
      hover:before:opacity-100
    `,
    elevated: `
      bg-navy-800/95
      border border-gold-500/10
      shadow-[0_10px_40px_rgba(0,0,0,0.3)]
      hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)]
      hover:border-gold-500/20
      before:absolute before:inset-0 before:rounded-2xl before:opacity-0
      before:bg-gradient-to-br before:from-gold-500/5 before:to-transparent
      before:transition-opacity before:duration-300
      hover:before:opacity-100
    `,
    glass: `
      bg-white/5 backdrop-blur-xl
      border border-gold-500/20
      hover:bg-white/10 hover:border-gold-500/30
      shadow-lg shadow-navy-900/20
      hover:shadow-xl hover:shadow-navy-900/30
      before:absolute before:inset-0 before:rounded-2xl before:opacity-0
      before:bg-gradient-to-br before:from-gold-500/10 before:to-transparent
      before:transition-opacity before:duration-300
      hover:before:opacity-100
    `,
    interactive: `
      bg-navy-800/80 backdrop-blur-sm
      border-2 border-gold-500/40
      hover:border-gold-500/60
      shadow-md shadow-navy-900/30
      hover:shadow-2xl hover:shadow-gold-500/20
      before:absolute before:inset-0 before:rounded-2xl before:opacity-0
      before:bg-gradient-to-br before:from-gold-500/20 before:to-transparent
      before:transition-all before:duration-500
      hover:before:opacity-100
      after:absolute after:inset-0 after:rounded-2xl
      after:bg-gradient-to-r after:from-transparent after:via-white/5 after:to-transparent
      after:-translate-x-full after:animate-shimmer
    `
  }

  const handleClick = onClick && !hoverable ? undefined : onClick

  return (
    <div 
      className={`
        relative rounded-2xl group
        transform transition-all duration-300 ease-out
        ${hoverable ? 'hover:-translate-y-1 hover:scale-[1.02] cursor-pointer' : ''}
        ${variants[variant]}
        ${animate ? 'animate-fade-in' : ''}
        ${pulse ? 'animate-pulse' : ''}
        ${className}
      `}
      onClick={handleClick}
      style={{
        animationDelay: animate && delay ? `${delay}ms` : undefined
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      aria-label={title || undefined}
    >
      {/* Animated glow effect for interactive variant */}
      {variant === 'interactive' && hoverable && (
        <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-gold-500/20 via-gold-400/20 to-gold-500/20 opacity-0 blur-sm group-hover:opacity-100 transition-opacity duration-500 animate-pulse pointer-events-none" />
      )}
      
      {/* Glass morphism overlay */}
      {variant === 'glass' && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      )}
      
      <div className={`
        relative rounded-2xl z-10
        transition-all duration-300
        ${paddingSizes[padding]}
      `}>
        {(title || subtitle || action) && (
          <div className="mb-4">
            <div className="flex justify-between items-start">
              <div>
                {title && (
                  <h3 className="text-xl font-bold bg-gradient-to-r from-gold to-gold-300 bg-clip-text text-transparent transition-all duration-300 group-hover:from-gold-400 group-hover:to-gold-200">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-sm text-gold-300/80 mt-1 transition-colors duration-300 group-hover:text-gold-200/80">
                    {subtitle}
                  </p>
                )}
              </div>
              {action && (
                <div className="transition-all duration-300 group-hover:scale-105 group-hover:translate-x-1">
                  {action}
                </div>
              )}
            </div>
          </div>
        )}
        <div className="relative">
          {children}
        </div>
      </div>
      
      {/* Hover shine effect */}
      {hoverable && (
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gold-500/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
        </div>
      )}
    </div>
  )
}