'use client'

import { ReactNode } from 'react'
import { X } from 'lucide-react'

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple'
type BadgeSize = 'sm' | 'md' | 'lg'

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  size?: BadgeSize
  icon?: ReactNode
  onRemove?: () => void
  className?: string
  pill?: boolean
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-gold-500/20 text-gold-300 border-gold-500/30',
  success: 'bg-green-500/20 text-green-400 border-green-500/30',
  warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  error: 'bg-red-500/20 text-red-400 border-red-500/30',
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
}

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base'
}

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  icon,
  onRemove,
  className = '',
  pill = true
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        font-medium border
        transition-all duration-200
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${pill ? 'rounded-full' : 'rounded-lg'}
        ${onRemove ? 'pr-1' : ''}
        ${className}
      `}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="
            flex-shrink-0 ml-1 -mr-0.5
            rounded-full p-0.5
            hover:bg-white/10 
            transition-colors duration-150
            focus:outline-none focus:ring-2 focus:ring-white/20
          "
          aria-label="Remove"
        >
          <X className={`
            ${size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-3.5 h-3.5' : 'w-4 h-4'}
          `} />
        </button>
      )}
    </span>
  )
}

// Chip component as an alias for Badge
export function Chip(props: BadgeProps) {
  return <Badge {...props} />
}