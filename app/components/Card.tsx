import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  title?: string
  subtitle?: string
  className?: string
  padding?: 'sm' | 'md' | 'lg'
  action?: ReactNode
}

export default function Card({
  children,
  title,
  subtitle,
  className = '',
  padding = 'md',
  action
}: CardProps) {
  const paddingSizes = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }

  return (
    <div className={`glass-morphism border-gradient rounded-2xl shadow-xl ${className}`}>
      <div className={`bg-navy-800/90 rounded-2xl ${paddingSizes[padding]}`}>
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