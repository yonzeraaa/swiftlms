import { ReactNode } from 'react'
import { X } from 'lucide-react'

interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'gradient'
  size?: 'sm' | 'md' | 'lg'
  removable?: boolean
  onRemove?: () => void
  icon?: ReactNode
  className?: string
  animate?: boolean
}

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  removable = false,
  onRemove,
  icon,
  className = '',
  animate = false
}: BadgeProps) {
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  }

  const variants = {
    default: 'bg-navy-700/50 text-gold-300 border border-gold-500/20',
    success: 'bg-green-500/30 text-green-700 border border-green-500/40 font-semibold',
    warning: 'bg-yellow-500/30 text-yellow-900 border border-yellow-500/40 font-semibold',
    error: 'bg-red-500/30 text-red-900 border border-red-500/40 font-semibold',
    info: 'bg-blue-500/30 text-blue-700 border border-blue-500/40 font-semibold',
    gradient: 'bg-gradient-to-r from-purple-500/20 via-gold-500/20 to-gold-600/20 text-gold-300 border border-gold-500/30'
  }

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        transition-all duration-300
        ${variants[variant]}
        ${sizes[size]}
        ${animate ? 'animate-pulse' : ''}
        hover:scale-105 hover:shadow-lg
        ${className}
      `}
    >
      {icon && (
        <span className="transition-transform hover:rotate-12">
          {icon}
        </span>
      )}
      {children}
      {removable && (
        <button
          onClick={onRemove}
          className="ml-1 -mr-1 hover:text-gold-100 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  )
}

// Chip component for filters
interface ChipProps {
  label: string
  selected?: boolean
  onClick?: () => void
  count?: number
  icon?: ReactNode
  color?: 'gold' | 'blue' | 'green' | 'purple' | 'red'
}

export function Chip({
  label,
  selected = false,
  onClick,
  count,
  icon,
  color = 'gold'
}: ChipProps) {
  const colors = {
    gold: {
      base: 'border-gold-500/30 text-gold-400',
      selected: 'bg-gold-500/20 border-gold-500 text-gold-200',
      hover: 'hover:border-gold-500/50 hover:bg-gold-500/10'
    },
    blue: {
      base: 'border-blue-500/30 text-blue-400',
      selected: 'bg-blue-500/20 border-blue-500 text-blue-200',
      hover: 'hover:border-blue-500/50 hover:bg-blue-500/10'
    },
    green: {
      base: 'border-green-500/30 text-green-400',
      selected: 'bg-green-500/20 border-green-500 text-green-200',
      hover: 'hover:border-green-500/50 hover:bg-green-500/10'
    },
    purple: {
      base: 'border-purple-500/30 text-purple-400',
      selected: 'bg-purple-500/20 border-purple-500 text-purple-200',
      hover: 'hover:border-purple-500/50 hover:bg-purple-500/10'
    },
    red: {
      base: 'border-red-500/30 text-red-400',
      selected: 'bg-red-500/20 border-red-500 text-red-200',
      hover: 'hover:border-red-500/50 hover:bg-red-500/10'
    }
  }

  const scheme = colors[color]

  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-full
        font-medium text-sm border transition-all duration-300
        ${selected ? scheme.selected : `${scheme.base} ${scheme.hover}`}
        transform hover:scale-105 active:scale-95
      `}
    >
      {icon && (
        <span className={`transition-transform ${selected ? 'rotate-12' : ''}`}>
          {icon}
        </span>
      )}
      {label}
      {count !== undefined && (
        <span className={`
          ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold
          ${selected ? 'bg-white/20' : 'bg-current/10'}
        `}>
          {count}
        </span>
      )}
    </button>
  )
}

// Tag component for categorization
interface TagProps {
  text: string
  color?: string
  size?: 'sm' | 'md' | 'lg'
  clickable?: boolean
  onClick?: () => void
}

export function Tag({
  text,
  color = 'gold',
  size = 'sm',
  clickable = false,
  onClick
}: TagProps) {
  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  }

  const Component = clickable ? 'button' : 'span'

  return (
    <Component
      onClick={onClick}
      className={`
        inline-block rounded
        bg-navy-800/50 text-gold-300
        ${sizes[size]}
        ${clickable ? 'hover:bg-navy-700/50 hover:text-gold-200 cursor-pointer transition-all duration-200' : ''}
      `}
    >
      #{text}
    </Component>
  )
}