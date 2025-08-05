import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  title?: string
  subtitle?: string
  className?: string
  padding?: 'sm' | 'md' | 'lg'
  action?: ReactNode
  hoverable?: boolean
  onClick?: () => void
}

export default function Card({
  children,
  title,
  subtitle,
  className = '',
  padding = 'md',
  action,
  hoverable = false,
  onClick
}: CardProps) {
  const paddingSizes = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }

  const handleClick = onClick && !hoverable ? undefined : onClick

  return (
    <div 
      className={`
        glass-morphism rounded-2xl
        transform transition-all duration-300
        shadow-[0_4px_20px_rgba(255,215,0,0.1)]
        hover:shadow-[0_8px_30px_rgba(255,215,0,0.15)]
        ${hoverable ? 'hover:-translate-y-1 cursor-pointer' : ''}
        ${className}
      `}
      onClick={handleClick}
    >
      <div className={`
        bg-navy-800/90 rounded-2xl 
        border border-gold-500/20 
        hover:border-gold-500/30 
        transition-colors duration-300
        ${paddingSizes[padding]}
      `}>
        {(title || subtitle || action) && (
          <div className="mb-4">
            <div className="flex justify-between items-start">
              <div>
                {title && <h3 className="text-xl font-bold text-gold">{title}</h3>}
                {subtitle && <p className="text-sm text-gold-300 mt-1">{subtitle}</p>}
              </div>
              {action && <div>{action}</div>}
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}