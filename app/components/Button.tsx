'use client'

import { ButtonHTMLAttributes, ReactNode, CSSProperties, forwardRef } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from '../contexts/LanguageContext'

const INK = '#1e130c'
const ACCENT = '#8b6d22'
const MUTED = '#7a6350'
const PARCH = '#faf6ee'
const BORDER = 'rgba(30,19,12,0.22)'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'subtle' | 'success' | 'warning'
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'ref'> {
  children?: ReactNode
  variant?: Variant
  size?: Size
  isLoading?: boolean
  loading?: boolean
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
  enableMotion?: boolean
}

const variantStyles: Record<Variant, CSSProperties> = {
  primary: {
    backgroundColor: INK,
    color: PARCH,
    border: `1px solid rgba(30,19,12,0.7)`,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    fontFamily: 'var(--font-lora, serif)',
    fontWeight: 600,
  },
  secondary: {
    backgroundColor: PARCH,
    color: INK,
    border: `1px solid ${BORDER}`,
    fontFamily: 'var(--font-lora, serif)',
    fontWeight: 500,
  },
  danger: {
    backgroundColor: 'transparent',
    color: MUTED,
    border: `1px solid ${MUTED}`,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    fontFamily: 'var(--font-lora, serif)',
    fontWeight: 600,
    fontStyle: 'italic',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: ACCENT,
    border: '1px solid transparent',
    fontFamily: 'var(--font-lora, serif)',
    fontWeight: 500,
  },
  outline: {
    backgroundColor: 'transparent',
    color: ACCENT,
    border: `1px solid rgba(139,109,34,0.45)`,
    fontFamily: 'var(--font-lora, serif)',
    fontWeight: 500,
  },
  subtle: {
    backgroundColor: 'rgba(139,109,34,0.1)',
    color: ACCENT,
    border: `1px solid rgba(139,109,34,0.22)`,
    fontFamily: 'var(--font-lora, serif)',
    fontWeight: 500,
  },
  success: {
    backgroundColor: INK,
    color: PARCH,
    border: `1px solid ${INK}`,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    fontFamily: 'var(--font-lora, serif)',
    fontWeight: 700,
  },
  warning: {
    backgroundColor: 'transparent',
    color: ACCENT,
    border: `1px solid ${ACCENT}`,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    fontFamily: 'var(--font-lora, serif)',
    fontWeight: 600,
  },
}

const sizeStyles: Record<Size, CSSProperties> = {
  xs: { padding: '0.25rem 0.625rem', fontSize: '0.75rem' },
  sm: { padding: '0.375rem 0.875rem', fontSize: '0.825rem' },
  md: { padding: '0.5rem 1.25rem', fontSize: '0.925rem' },
  lg: { padding: '0.75rem 1.75rem', fontSize: '1rem' },
  xl: { padding: '1rem 2.25rem', fontSize: '1.05rem' },
}

function Spinner() {
  return (
    <span
      style={{
        display: 'inline-block',
        width: '0.9em',
        height: '0.9em',
        border: `2px solid currentColor`,
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }}
    />
  )
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>((
  {
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    loading = false,
    icon,
    iconPosition = 'left',
    fullWidth = false,
    enableMotion = false,
    style,
    disabled,
    onClick,
    ...props
  },
  ref
) => {
  const { t } = useTranslation()
  const actualLoading = isLoading || loading

  const baseStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    cursor: disabled || actualLoading ? 'not-allowed' : 'pointer',
    opacity: disabled || actualLoading ? 0.55 : 1,
    transition: 'opacity 0.2s, background-color 0.2s, color 0.2s',
    whiteSpace: 'nowrap',
    width: fullWidth ? '100%' : undefined,
    ...variantStyles[variant],
    ...sizeStyles[size],
    ...style,
  }

  const content = actualLoading ? (
    <>
      <Spinner />
      <span>{t('common.loading')}</span>
    </>
  ) : (
    <>
      {icon && iconPosition === 'left' && <span style={{ display: 'flex', flexShrink: 0 }}>{icon}</span>}
      <span>{children}</span>
      {icon && iconPosition === 'right' && <span style={{ display: 'flex', flexShrink: 0 }}>{icon}</span>}
    </>
  )

  if (enableMotion) {
    const { ...rest } = props as any
    return (
      <motion.button
        ref={ref as any}
        whileHover={{ opacity: 0.88 }}
        whileTap={{ scale: 0.98 }}
        style={baseStyle}
        disabled={disabled || actualLoading}
        onClick={onClick}
        {...rest}
      >
        {content}
      </motion.button>
    )
  }

  return (
    <button
      ref={ref}
      style={baseStyle}
      disabled={disabled || actualLoading}
      onClick={onClick}
      {...props}
    >
      {content}
    </button>
  )
})

Button.displayName = 'Button'
export default Button
