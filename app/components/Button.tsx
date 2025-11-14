'use client'

import { ButtonHTMLAttributes, ReactNode, useRef, MouseEvent, forwardRef } from 'react'
import Spinner from './ui/Spinner'
import { motion, HTMLMotionProps } from 'framer-motion'
import { useTranslation } from '../contexts/LanguageContext'

type MotionButtonProps = HTMLMotionProps<'button'> & ButtonHTMLAttributes<HTMLButtonElement>

interface ButtonProps extends Omit<MotionButtonProps, 'onDrag' | 'onDragEnd' | 'onDragStart' | 'ref'> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'subtle' | 'success' | 'warning'
  size?: 'sm' | 'md' | 'lg' | 'xs' | 'xl'
  isLoading?: boolean
  loading?: boolean
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
  rounded?: 'sm' | 'md' | 'lg' | 'full'
  enableMotion?: boolean
  align?: 'left' | 'center' | 'right'
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
    rounded = 'lg',
    enableMotion = false,
    align = 'center',
    className = '',
    disabled,
    onClick,
    ...props
  },
  ref
) => {
  const { t } = useTranslation()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const actualLoading = isLoading || loading

  const roundedStyles = {
    sm: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full'
  }

  const alignStyles = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end'
  }

  const baseStyles = `
    relative font-semibold ${roundedStyles[rounded]}
    transition-all duration-200 ease-out
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    inline-flex items-center ${alignStyles[align]} gap-2 whitespace-nowrap
    active:scale-[0.98]
    ${fullWidth ? 'w-full' : ''}
  `
  
  const variants = {
    primary: `
      bg-gold-500 hover:bg-gold-600
      text-navy-900
      focus:ring-gold-400 focus:ring-offset-navy-800
      shadow-sm
      group
    `,
    secondary: `
      bg-navy-700 hover:bg-navy-600
      text-gold-200 hover:text-gold-100
      border border-gold-500/20 hover:border-gold-500/30
      focus:ring-gold-500 focus:ring-offset-navy-800
      shadow-sm
    `,
    danger: `
      bg-red-600 hover:bg-red-700
      text-white
      focus:ring-red-400 focus:ring-offset-navy-800
      shadow-sm
    `,
    ghost: `
      bg-transparent hover:bg-gold-500/10
      text-gold-300 hover:text-gold-200
      border border-transparent hover:border-gold-500/20
      focus:ring-gold-500 focus:ring-offset-navy-800
    `,
    outline: `
      bg-transparent
      text-gold-400 hover:text-gold-300
      border border-gold-500/30 hover:border-gold-500/50
      hover:bg-gold-500/10
      focus:ring-gold-500 focus:ring-offset-navy-800
    `,
    subtle: `
      bg-gold-500/10 hover:bg-gold-500/15
      text-gold-300 hover:text-gold-200
      border border-gold-500/20 hover:border-gold-500/30
      focus:ring-gold-500 focus:ring-offset-navy-800
    `,
    success: `
      bg-green-600 hover:bg-green-700
      text-white
      focus:ring-green-400 focus:ring-offset-navy-800
      shadow-sm
    `,
    warning: `
      bg-yellow-500 hover:bg-yellow-600
      text-navy-900
      focus:ring-yellow-400 focus:ring-offset-navy-800
      shadow-sm
    `
  }
  
  const sizes = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl'
  }

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6'
  }

  const spinnerColors = {
    primary: 'border-navy-900',
    warning: 'border-navy-900',
    success: 'border-white',
    danger: 'border-white',
    gradient: 'border-white',
    secondary: 'border-gold-500',
    ghost: 'border-gold-500',
    outline: 'border-gold-500',
    subtle: 'border-gold-500'
  }

  const buttonContent = (
    <>
      {actualLoading ? (
        <>
          <Spinner
            size={size === 'xs' ? 'sm' : (size as any)}
            className="mr-1"
            colorClass={spinnerColors[variant]}
          />
          <span className="sr-only">{t('common.loading')}</span>
          <span aria-hidden="true">{t('common.loading')}</span>
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <span className="flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:-translate-x-0.5" aria-hidden="true">
              {icon}
            </span>
          )}
          <span className="relative z-10">
            {children}
          </span>
          {icon && iconPosition === 'right' && (
            <span className="flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:translate-x-0.5" aria-hidden="true">
              {icon}
            </span>
          )}
        </>
      )}
    </>
  )

  // Remove props conflitantes com framer-motion
  const { onAnimationStart, ...restProps } = props as any

  if (enableMotion) {
    return (
      <motion.button
        ref={ref || buttonRef}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className={`group ${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || actualLoading}
        onClick={onClick}
        data-theme-variant={variant}
        {...restProps}
      >
        {buttonContent}
      </motion.button>
    )
  }

  return (
    <button
      ref={ref || buttonRef}
      className={`group ${baseStyles} ${variants[variant]} ${sizes[size]} hover:-translate-y-0.5 ${className}`}
      disabled={disabled || actualLoading}
      onClick={onClick}
      data-theme-variant={variant}
      {...restProps}
    >
      {buttonContent}
    </button>
  )
})

Button.displayName = 'Button'

export default Button
