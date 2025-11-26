'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Minus, Info, ArrowUp, ArrowDown } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: number | string
  subtitle?: string
  icon?: React.ReactNode
  trend?: {
    value: number
    direction: 'up' | 'down' | 'neutral'
    label?: string
  }
  format?: 'number' | 'currency' | 'percentage'
  animate?: boolean
  color?: 'gold' | 'green' | 'red' | 'blue' | 'purple'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  tooltip?: string
  onClick?: () => void
  className?: string
}

export default function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  format = 'number',
  animate = true,
  color = 'gold',
  size = 'md',
  loading = false,
  tooltip,
  onClick,
  className = ''
}: MetricCardProps) {
  const [displayValue, setDisplayValue] = useState(animate && typeof value === 'number' ? 0 : value)
  const [isHovered, setIsHovered] = useState(false)

  // Animação de contagem para números
  useEffect(() => {
    if (!animate || typeof value !== 'number' || loading) return

    const duration = 1000 // 1 segundo
    const steps = 30
    const stepDuration = duration / steps
    const increment = value / steps
    let currentStep = 0

    const timer = setInterval(() => {
      currentStep++
      if (currentStep === steps) {
        setDisplayValue(value)
        clearInterval(timer)
      } else {
        setDisplayValue(Math.round(increment * currentStep))
      }
    }, stepDuration)

    return () => clearInterval(timer)
  }, [value, animate, loading])

  // Formatar valor baseado no tipo
  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val

    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(val)
      case 'percentage':
        return `${val}%`
      default:
        return new Intl.NumberFormat('pt-BR').format(val)
    }
  }

  // Classes de tamanho
  const sizeClasses = {
    sm: {
      card: 'p-4',
      title: 'text-xs',
      value: 'text-2xl',
      subtitle: 'text-xs',
      icon: 'w-8 h-8'
    },
    md: {
      card: 'p-6',
      title: 'text-sm',
      value: 'text-3xl',
      subtitle: 'text-sm',
      icon: 'w-10 h-10'
    },
    lg: {
      card: 'p-8',
      title: 'text-base',
      value: 'text-4xl',
      subtitle: 'text-base',
      icon: 'w-12 h-12'
    }
  }

  // Classes de cor
  const colorClasses = {
    gold: {
      bg: 'bg-gradient-to-br from-gold-500/10 to-gold-600/10',
      border: 'border-gold-500/20',
      icon: 'text-gold-400',
      value: 'text-gold-100',
      trend: {
        up: 'text-green-400 bg-green-500/20',
        down: 'text-red-400 bg-red-500/20',
        neutral: 'text-gold-400 bg-gold-500/20'
      }
    },
    green: {
      bg: 'bg-gradient-to-br from-green-500/10 to-green-600/10',
      border: 'border-green-500/20',
      icon: 'text-green-400',
      value: 'text-green-100',
      trend: {
        up: 'text-green-400 bg-green-500/20',
        down: 'text-red-400 bg-red-500/20',
        neutral: 'text-gray-400 bg-gray-500/20'
      }
    },
    red: {
      bg: 'bg-gradient-to-br from-red-500/10 to-red-600/10',
      border: 'border-red-500/20',
      icon: 'text-red-400',
      value: 'text-red-100',
      trend: {
        up: 'text-green-400 bg-green-500/20',
        down: 'text-red-400 bg-red-500/20',
        neutral: 'text-gray-400 bg-gray-500/20'
      }
    },
    blue: {
      bg: 'bg-gradient-to-br from-blue-500/10 to-blue-600/10',
      border: 'border-blue-500/20',
      icon: 'text-blue-400',
      value: 'text-blue-100',
      trend: {
        up: 'text-green-400 bg-green-500/20',
        down: 'text-red-400 bg-red-500/20',
        neutral: 'text-gray-400 bg-gray-500/20'
      }
    },
    purple: {
      bg: 'bg-gradient-to-br from-purple-500/10 to-purple-600/10',
      border: 'border-purple-500/20',
      icon: 'text-purple-400',
      value: 'text-purple-100',
      trend: {
        up: 'text-green-400 bg-green-500/20',
        down: 'text-red-400 bg-red-500/20',
        neutral: 'text-gray-400 bg-gray-500/20'
      }
    }
  }

  const currentSize = sizeClasses[size]
  const currentColor = colorClasses[color]

  if (loading) {
    return (
      <div className={`
        ${currentSize.card}
        ${currentColor.bg}
        border ${currentColor.border}
        rounded-xl
        ${className}
      `}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gold-500/20 rounded w-24"></div>
          <div className="h-8 bg-gold-500/20 rounded w-32"></div>
          <div className="h-3 bg-gold-500/20 rounded w-20"></div>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative
        ${currentSize.card}
        ${currentColor.bg}
        border ${currentColor.border}
        rounded-xl
        transition-all duration-300
        ${onClick ? 'cursor-pointer' : ''}
        ${isHovered ? 'transform -translate-y-1 shadow-lg shadow-gold-500/10' : ''}
        ${className}
      `}
    >
      {/* Tooltip */}
      {tooltip && (
        <div className="absolute top-2 right-2 group">
          <Info className="w-4 h-4 text-gold-400/50 cursor-help" />
          <div className="absolute right-0 top-6 w-48 p-2 bg-navy-800 border border-gold-500/20 rounded-lg text-xs text-gold-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
            {tooltip}
          </div>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          {/* Título */}
          <h3 className={`${currentSize.title} font-medium text-gold-300 uppercase tracking-wider`}>
            {title}
          </h3>

          {/* Valor */}
          <div className={`${currentSize.value} font-bold ${currentColor.value} tracking-tight`}>
            {formatValue(displayValue)}
          </div>

          {/* Trend */}
          {trend && (
            <div className="flex items-center gap-2">
              <span className={`
                inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                ${currentColor.trend[trend.direction]}
              `}>
                {trend.direction === 'up' ? (
                  <ArrowUp className="w-3 h-3" />
                ) : trend.direction === 'down' ? (
                  <ArrowDown className="w-3 h-3" />
                ) : (
                  <Minus className="w-3 h-3" />
                )}
                {Math.abs(trend.value)}%
              </span>
              {trend.label && (
                <span className="text-gold-400 text-xs">{trend.label}</span>
              )}
            </div>
          )}

          {/* Subtitle */}
          {subtitle && (
            <p className={`${currentSize.subtitle} text-gold-400 mt-1`}>
              {subtitle}
            </p>
          )}
        </div>

        {/* Ícone */}
        {icon && (
          <div className={`
            ${currentSize.icon}
            ${currentColor.icon}
            opacity-30
            transform rotate-12
            ${isHovered ? 'scale-110 rotate-0' : ''}
            transition-all duration-300
          `}>
            {icon}
          </div>
        )}
      </div>

      {/* Mini gráfico de barras (simulado) */}
      {trend && (
        <div className="mt-4 flex items-end gap-1 h-8">
          {[40, 65, 45, 80, 55, 70, 85].map((height, i) => (
            <div
              key={i}
              className="flex-1 bg-gold-500/20 rounded-t transition-all duration-500"
              style={{
                height: `${isHovered ? height : height * 0.7}%`,
                transitionDelay: `${i * 50}ms`
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}