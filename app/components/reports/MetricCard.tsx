'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Minus, Info, ArrowUp, ArrowDown } from 'lucide-react'

const INK = '#1e130c'
const ACCENT = '#8b6d22'
const MUTED = '#7a6350'
const PARCH = '#faf6ee'
const BORDER = 'rgba(30,19,12,0.12)'

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
  size = 'md',
  loading = false,
  tooltip,
  onClick,
  className = ''
}: MetricCardProps) {
  const [displayValue, setDisplayValue] = useState(animate && typeof value === 'number' ? 0 : value)
  const [isHovered, setIsHovered] = useState(false)

  // Animação de contagem
  useEffect(() => {
    if (!animate || typeof value !== 'number' || loading) {
      setDisplayValue(value)
      return
    }

    const duration = 1000
    const steps = 30
    const stepDuration = duration / steps
    const increment = value / steps
    let currentStep = 0

    const timer = setInterval(() => {
      currentStep++
      if (currentStep >= steps) {
        setDisplayValue(value)
        clearInterval(timer)
      } else {
        setDisplayValue(Math.round(increment * currentStep))
      }
    }, stepDuration)

    return () => clearInterval(timer)
  }, [value, animate, loading])

  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val)
      case 'percentage':
        return `${val}%`
      default:
        return new Intl.NumberFormat('pt-BR').format(val)
    }
  }

  const sizeClasses = {
    sm: { padding: '1rem', titleSize: '0.75rem', valueSize: '2rem', subtitleSize: '0.75rem', iconSize: 32 },
    md: { padding: '1.5rem', titleSize: '0.85rem', valueSize: '2.5rem', subtitleSize: '0.85rem', iconSize: 40 },
    lg: { padding: '2rem', titleSize: '0.95rem', valueSize: '3.2rem', subtitleSize: '0.95rem', iconSize: 48 }
  }
  const currentSize = sizeClasses[size || 'md'] || sizeClasses.md

  if (loading) {
    return (
      <div 
        className={className} 
        style={{ 
          backgroundColor: PARCH, 
          border: `1px solid ${BORDER}`, 
          borderRadius: '8px', 
          padding: currentSize.padding,
          boxShadow: '0 1px 12px rgba(30,19,12,0.06)'
        }}
        data-testid="metric-card-loading"
      >
        <div className="animate-pulse flex flex-col gap-3">
          <div style={{ height: '1rem', backgroundColor: BORDER, borderRadius: '4px', width: '40%' }}></div>
          <div style={{ height: '2.5rem', backgroundColor: BORDER, borderRadius: '4px', width: '60%' }}></div>
          <div style={{ height: '0.75rem', backgroundColor: BORDER, borderRadius: '4px', width: '30%' }}></div>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={className}
      data-testid="metric-card"
      style={{
        backgroundColor: PARCH,
        border: `1px solid ${isHovered ? 'rgba(30,19,12,0.22)' : BORDER}`,
        boxShadow: isHovered ? '0 3px 18px rgba(30,19,12,0.1)' : '0 1px 12px rgba(30,19,12,0.06)',
        borderRadius: '8px',
        padding: currentSize.padding,
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        transform: isHovered ? 'translateY(-2px)' : 'none',
        overflow: 'hidden'
      }}
    >
      {tooltip && (
        <div className="absolute top-3 right-3 group z-20" data-testid="metric-card-tooltip-icon">
          <Info size={16} style={{ color: MUTED, opacity: 0.6, cursor: 'help' }} />
          <div className="absolute right-0 top-6 w-48 p-3 rounded group-hover:opacity-100 group-hover:visible"
            data-testid="metric-card-tooltip-content"
            style={{ 
              backgroundColor: INK, 
              color: PARCH, 
              boxShadow: '0 4px 12px rgba(30,19,12,0.2)',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-lora, serif)',
              opacity: 0,
              visibility: 'hidden',
              transition: 'all 0.2s ease',
              zIndex: 30
            }}
          >
            {tooltip}
          </div>
        </div>
      )}

      <div className="flex items-start justify-between relative z-10 w-full">
        <div className="flex-1 flex flex-col overflow-hidden">
          <h3 style={{ 
            fontFamily: 'var(--font-lora, serif)', 
            fontSize: currentSize.titleSize, 
            color: MUTED, 
            textTransform: 'uppercase', 
            letterSpacing: '0.1em',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden'
          }}>
            {title}
          </h3>

          <div 
            data-testid="metric-card-value"
            style={{ 
              fontFamily: 'var(--font-playfair, serif)', 
              fontSize: currentSize.valueSize, 
              fontWeight: 700, 
              color: INK, 
              lineHeight: 1.1,
              marginTop: '0.75rem',
              marginBottom: '0.5rem'
            }}
          >
            {formatValue(displayValue)}
          </div>

          {(trend || subtitle) && (
            <div className="flex flex-col gap-1.5 mt-auto">
              {trend && (
                <div className="flex items-center gap-2 flex-wrap" data-testid="metric-card-trend">
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-ui, sans-serif)',
                    fontWeight: 600,
                    backgroundColor: trend.direction === 'up' ? 'rgba(46, 125, 50, 0.08)' : trend.direction === 'down' ? 'rgba(198, 40, 40, 0.08)' : 'rgba(30,19,12,0.05)',
                    color: trend.direction === 'up' ? '#2e7d32' : trend.direction === 'down' ? '#c62828' : MUTED
                  }}>
                    {trend.direction === 'up' ? <ArrowUp size={12} data-testid="trend-up" /> : trend.direction === 'down' ? <ArrowDown size={12} data-testid="trend-down" /> : <Minus size={12} data-testid="trend-neutral" />}
                    {Math.abs(trend.value)}%
                  </span>
                  {trend.label && (
                    <span style={{ fontSize: '0.75rem', color: MUTED, fontFamily: 'var(--font-lora, serif)' }}>{trend.label}</span>
                  )}
                </div>
              )}
              {subtitle && (
                <p 
                  data-testid="metric-card-subtitle"
                  style={{ 
                    fontFamily: 'var(--font-lora, serif)', 
                    fontSize: currentSize.subtitleSize, 
                    fontStyle: 'italic', 
                    color: ACCENT,
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden'
                  }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {icon && (
        <div 
          data-testid="metric-card-icon"
          style={{ 
            color: ACCENT, 
            opacity: isHovered ? 0.08 : 0.04, 
            transform: isHovered ? 'scale(1.2)' : 'scale(1)', 
            transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'absolute',
            right: '-10%',
            bottom: '-10%',
            zIndex: 0,
            pointerEvents: 'none'
          }}
        >
          <div style={{ width: currentSize.iconSize * 3, height: currentSize.iconSize * 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ transform: 'scale(2.5)' }}>
              {icon}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
