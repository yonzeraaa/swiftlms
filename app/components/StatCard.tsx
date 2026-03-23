import { ReactNode } from 'react'
import { ClassicRule } from './ui/RenaissanceSvgs'

const INK = '#1e130c'
const ACCENT = '#8b6d22'
const MUTED = '#7a6350'
const PARCH = '#faf6ee'
const BORDER = 'rgba(30,19,12,0.12)'

interface StatCardProps {
  title: string
  value: string | number
  icon: ReactNode
  subtitle?: string
  trend?: { value: number; isPositive: boolean }
  // Legacy props kept for API compatibility — ignored visually
  variant?: string
  color?: string
}

export default function StatCard({ title, value, icon, subtitle }: StatCardProps) {
  return (
    <div
      style={{
        backgroundColor: PARCH,
        border: `1px solid ${BORDER}`,
        boxShadow: '0 1px 12px rgba(30,19,12,0.06)',
        padding: '1.25rem 1.5rem',
        position: 'relative',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = 'rgba(30,19,12,0.22)'
        el.style.boxShadow = '0 3px 18px rgba(30,19,12,0.1)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = BORDER
        el.style.boxShadow = '0 1px 12px rgba(30,19,12,0.06)'
      }}
    >
      {/* Label */}
      <p
        style={{
          fontFamily: 'var(--font-lora, serif)',
          fontSize: '0.72rem',
          fontWeight: 600,
          color: MUTED,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          margin: '0 0 0.5rem',
        }}
      >
        {title}
      </p>

      {/* Value + Icon row */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '0.5rem' }}>
        <p
          style={{
            fontFamily: 'var(--font-playfair, serif)',
            fontSize: '2.25rem',
            fontWeight: 700,
            color: INK,
            margin: 0,
            lineHeight: 1,
          }}
        >
          {value}
        </p>
        <div style={{ color: ACCENT, opacity: 0.75, flexShrink: 0 }}>
          {icon}
        </div>
      </div>

      {/* Divider */}
      <div style={{ margin: '0.75rem 0 0.5rem' }}>
        <ClassicRule />
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p
          style={{
            fontFamily: 'var(--font-lora, serif)',
            fontSize: '0.8rem',
            fontStyle: 'italic',
            color: MUTED,
            margin: 0,
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  )
}
