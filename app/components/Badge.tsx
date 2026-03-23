import { ReactNode, CSSProperties } from 'react'
import { X } from 'lucide-react'

const INK = '#1e130c'
const ACCENT = '#8b6d22'
const MUTED = '#7a6350'
const BORDER = 'rgba(30,19,12,0.12)'

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'gradient'
type BadgeSize = 'sm' | 'md' | 'lg'

const variantStyles: Record<BadgeVariant, CSSProperties> = {
  default:  { backgroundColor: 'rgba(30,19,12,0.07)', color: INK,        border: `1px solid ${BORDER}` },
  success:  { backgroundColor: 'rgba(30,19,12,0.05)', color: INK,        border: `1px solid ${INK}`, fontWeight: 700 },
  warning:  { backgroundColor: 'transparent',         color: ACCENT,     border: `1px solid ${ACCENT}` },
  error:    { backgroundColor: 'transparent',         color: MUTED,      border: `1px solid ${MUTED}`, fontStyle: 'italic' },
  info:     { backgroundColor: 'rgba(122,99,80,0.12)', color: MUTED,     border: `1px solid ${BORDER}` },
  gradient: { backgroundColor: 'rgba(139,109,34,0.1)', color: ACCENT,    border: '1px solid rgba(139,109,34,0.25)' },
}

const sizeStyles: Record<BadgeSize, CSSProperties> = {
  sm: { padding: '0.15rem 0.5rem',  fontSize: '0.72rem' },
  md: { padding: '0.25rem 0.625rem', fontSize: '0.8rem' },
  lg: { padding: '0.35rem 0.875rem', fontSize: '0.875rem' },
}

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  size?: BadgeSize
  removable?: boolean
  onRemove?: () => void
  icon?: ReactNode
  style?: CSSProperties
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
  style,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        fontFamily: 'var(--font-lora, serif)',
        fontWeight: 500,
        lineHeight: 1,
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
    >
      {icon && <span style={{ display: 'flex' }}>{icon}</span>}
      {children}
      {removable && (
        <button
          onClick={onRemove}
          style={{
            display: 'flex',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'inherit',
            opacity: 0.6,
            padding: 0,
            marginLeft: '0.1rem',
          }}
        >
          <X size={10} />
        </button>
      )}
    </span>
  )
}

// ── Chip — filter selector ──────────────────────────────────────────────────

interface ChipProps {
  label: string
  selected?: boolean
  onClick?: () => void
  count?: number
  icon?: ReactNode
  color?: 'gold' | 'blue' | 'green' | 'purple' | 'red'
}

export function Chip({ label, selected = false, onClick, count, icon }: ChipProps) {
  const baseStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.35rem 0.75rem',
    fontFamily: 'var(--font-lora, serif)',
    fontSize: '0.85rem',
    fontWeight: 500,
    cursor: onClick ? 'pointer' : undefined,
    transition: 'border-color 0.15s, background-color 0.15s, color 0.15s',
    background: 'none',
    border: 'none',
  }

  const selectedStyle: CSSProperties = {
    backgroundColor: 'rgba(139,109,34,0.12)',
    border: `1px solid ${ACCENT}`,
    color: INK,
  }

  const unselectedStyle: CSSProperties = {
    backgroundColor: 'transparent',
    border: `1px solid ${BORDER}`,
    color: MUTED,
  }

  return (
    <button
      onClick={onClick}
      style={{ ...baseStyle, ...(selected ? selectedStyle : unselectedStyle) }}
    >
      {icon && <span style={{ display: 'flex' }}>{icon}</span>}
      {label}
      {count !== undefined && (
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 600,
            color: 'inherit',
            opacity: 0.7,
          }}
        >
          {count}
        </span>
      )}
    </button>
  )
}

// ── Tag — category label ────────────────────────────────────────────────────

interface TagProps {
  text: string
  color?: string
  size?: 'sm' | 'md' | 'lg'
  clickable?: boolean
  onClick?: () => void
}

const tagSizes: Record<'sm' | 'md' | 'lg', CSSProperties> = {
  sm: { padding: '0.15rem 0.45rem', fontSize: '0.72rem' },
  md: { padding: '0.25rem 0.625rem', fontSize: '0.8rem' },
  lg: { padding: '0.35rem 0.875rem', fontSize: '0.875rem' },
}

export function Tag({ text, size = 'sm', clickable = false, onClick }: TagProps) {
  const Component = clickable ? 'button' : 'span'

  return (
    <Component
      onClick={onClick}
      style={{
        display: 'inline-block',
        fontFamily: 'var(--font-lora, serif)',
        fontWeight: 500,
        color: MUTED,
        backgroundColor: 'rgba(30,19,12,0.05)',
        border: `1px solid ${BORDER}`,
        cursor: clickable ? 'pointer' : undefined,
        transition: 'color 0.15s',
        ...tagSizes[size],
      }}
    >
      #{text}
    </Component>
  )
}
