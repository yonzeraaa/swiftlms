'use client'

import { ReactNode, CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { ClassicRule } from './ui/RenaissanceSvgs'

const INK = '#1e130c'
const MUTED = '#7a6350'
const PARCH = '#faf6ee'
const BORDER = 'rgba(30,19,12,0.12)'

type Padding = 'none' | 'sm' | 'md' | 'lg' | 'xl'

interface CardProps {
  children: ReactNode
  title?: string
  subtitle?: string
  style?: CSSProperties
  className?: string
  padding?: Padding
  action?: ReactNode
  hoverable?: boolean
  onClick?: () => void
  animate?: boolean
  delay?: number
  // legacy props kept for API compatibility — ignored visually
  variant?: string
  depth?: number
}

const paddingMap: Record<Padding, string> = {
  none: '0',
  sm: '1rem',
  md: '1.5rem',
  lg: '2rem',
  xl: '2.5rem',
}

export default function Card({
  children,
  title,
  subtitle,
  style,
  className = '',
  padding = 'md',
  action,
  hoverable = false,
  onClick,
  animate = false,
  delay = 0,
}: CardProps) {
  const hasHeader = !!(title || action)

  const baseStyle: CSSProperties = {
    backgroundColor: PARCH,
    border: `1px solid ${BORDER}`,
    boxShadow: '0 1px 12px rgba(30,19,12,0.06)',
    padding: paddingMap[padding],
    position: 'relative',
    cursor: onClick ? 'pointer' : undefined,
    transition: hoverable ? 'border-color 0.2s, box-shadow 0.2s' : undefined,
    ...style,
  }

  const content = (
    <>
      {hasHeader && (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: '0.75rem',
            }}
          >
            <div>
              {title && (
                <h3
                  style={{
                    fontFamily: 'var(--font-playfair, serif)',
                    fontSize: '1.15rem',
                    fontWeight: 600,
                    color: INK,
                    margin: 0,
                    lineHeight: 1.3,
                  }}
                >
                  {title}
                </h3>
              )}
              {subtitle && (
                <p
                  style={{
                    fontFamily: 'var(--font-lora, serif)',
                    fontSize: '0.875rem',
                    fontStyle: 'italic',
                    color: MUTED,
                    margin: '0.25rem 0 0',
                  }}
                >
                  {subtitle}
                </p>
              )}
            </div>
            {action && <div style={{ flexShrink: 0, marginLeft: '1rem' }}>{action}</div>}
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <ClassicRule />
          </div>
        </div>
      )}
      {children}
    </>
  )

  if (animate) {
    return (
      <motion.div
        className={className}
        style={baseStyle}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.5, ease: 'easeOut' }}
        onClick={onClick}
        whileHover={hoverable ? { borderColor: 'rgba(30,19,12,0.22)' } : undefined}
      >
        {content}
      </motion.div>
    )
  }

  return (
    <div
      className={className}
      style={baseStyle}
      onClick={onClick}
      onMouseEnter={hoverable ? (e) => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = 'rgba(30,19,12,0.22)'
        el.style.boxShadow = '0 3px 18px rgba(30,19,12,0.1)'
      } : undefined}
      onMouseLeave={hoverable ? (e) => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = BORDER
        el.style.boxShadow = '0 1px 12px rgba(30,19,12,0.06)'
      } : undefined}
    >
      {content}
    </div>
  )
}

export function GlassCard({ children, className = '', ...props }: CardProps) {
  return (
    <Card className={className} {...props}>
      {children}
    </Card>
  )
}
