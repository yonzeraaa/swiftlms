'use client'

import { ButtonHTMLAttributes, ReactNode, useRef, MouseEvent, forwardRef } from 'react'
import Spinner from './ui/Spinner'
import { motion, HTMLMotionProps } from 'framer-motion'
import { useTranslation } from '../contexts/LanguageContext'

type MotionButtonProps = HTMLMotionProps<'button'> & ButtonHTMLAttributes<HTMLButtonElement>

interface ButtonProps extends Omit<MotionButtonProps, 'onDrag' | 'onDragEnd' | 'onDragStart' | 'ref'> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'gradient' | 'outline' | 'subtle' | 'success'
  size?: 'sm' | 'md' | 'lg' | 'xs' | 'xl'
  isLoading?: boolean
  loading?: boolean // Alias para compatibilidade com PremiumButton
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
  rounded?: 'sm' | 'md' | 'lg' | 'full'
  pulse?: boolean
  glow?: boolean
  enableMotion?: boolean
  ripple?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>((
  {
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    loading = false, // Alias para compatibilidade
    icon,
    iconPosition = 'left',
    fullWidth = false,
    rounded = 'lg',
    pulse = false,
    glow = false,
    enableMotion = false,
    ripple = true,
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
  
  const handleRipple = (e: MouseEvent<HTMLButtonElement>) => {
    if (!ripple) return
    
    const button = buttonRef.current || (ref as any)?.current
    if (!button) return

    const rect = button.getBoundingClientRect()
    const rippleElement = document.createElement('span')
    const size = Math.max(rect.width, rect.height)
    const x = e.clientX - rect.left - size / 2
    const y = e.clientY - rect.top - size / 2

    rippleElement.style.width = rippleElement.style.height = size + 'px'
    rippleElement.style.left = x + 'px'
    rippleElement.style.top = y + 'px'
    rippleElement.classList.add('ripple')

    button.appendChild(rippleElement)

    setTimeout(() => {
      rippleElement.remove()
    }, 600)
  }

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !actualLoading) {
      handleRipple(e)
    }
    onClick?.(e)
  }

  const roundedStyles = {
    sm: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full'
  }

  const baseStyles = `
    relative overflow-hidden font-semibold ${roundedStyles[rounded]}
    transition-all duration-300 ease-out
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
    inline-flex items-center justify-center gap-2 whitespace-nowrap
    transform active:scale-[0.98]
    ${fullWidth ? 'w-full' : ''}
    ${pulse ? 'animate-pulse' : ''}
    ${glow ? 'shadow-glow hover:shadow-glow-lg' : ''}
    before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-300
    hover:before:opacity-100
  `
  
  const variants = {
    primary: `
      bg-gradient-to-r from-gold-500 to-gold-600 
      hover:from-gold-600 hover:to-gold-700 
      text-navy-900 
      focus:ring-gold-400 focus:ring-offset-navy-800 
      hover:shadow-xl
      shadow-lg shadow-gold-500/20
      before:bg-gradient-to-r before:from-gold-400/20 before:to-transparent
      group
    `,
    secondary: `
      bg-navy-700/50 hover:bg-navy-600/50 
      text-gold-200 hover:text-gold-100
      border border-gold-500/30 hover:border-gold-500/50
      focus:ring-gold-500 focus:ring-offset-navy-800
      backdrop-blur-sm
      hover:shadow-md hover:shadow-gold-500/10
      before:bg-gradient-to-r before:from-gold-500/10 before:to-transparent
    `,
    danger: `
      bg-red-600 hover:bg-red-700 
      text-white 
      focus:ring-red-400 focus:ring-offset-navy-800
      hover:shadow-lg shadow-red-500/20
      before:bg-gradient-to-r before:from-red-400/20 before:to-transparent
    `,
    ghost: `
      bg-transparent hover:bg-gold-500/10
      text-gold-300 hover:text-gold-100
      border border-transparent hover:border-gold-500/20
      focus:ring-gold-500 focus:ring-offset-navy-800
      before:bg-gold-500/5
    `,
    gradient: `
      bg-gradient-to-r from-purple-500 via-gold-500 to-gold-600
      text-white font-bold
      hover:shadow-2xl
      focus:ring-gold-400 focus:ring-offset-navy-800
      bg-[length:200%_100%] bg-[position:0%_0%]
      hover:bg-[position:100%_0%]
      transition-all duration-500
      before:bg-white/10
    `,
    outline: `
      bg-transparent 
      text-gold-400 hover:text-gold-300
      border-2 border-gold-500/50 hover:border-gold-400
      hover:bg-gold-500/10
      focus:ring-gold-500 focus:ring-offset-navy-800
      hover:shadow-md hover:shadow-gold-500/20
      before:bg-gold-500/5
    `,
    subtle: `
      bg-gold-500/10 hover:bg-gold-500/20
      text-gold-300 hover:text-gold-200
      border border-gold-500/20 hover:border-gold-500/30
      focus:ring-gold-500 focus:ring-offset-navy-800
      hover:shadow-sm
      before:bg-gold-500/5
    `,
    success: `
      bg-gradient-to-r from-green-500 to-green-600
      hover:from-green-600 hover:to-green-700
      text-white
      focus:ring-green-400 focus:ring-offset-navy-800
      hover:shadow-lg
      shadow-md shadow-green-500/20
      before:bg-gradient-to-r before:from-green-400/20 before:to-transparent
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

  const buttonContent = (
    <>
      {actualLoading ? (
        <>
          <Spinner size={size === 'xs' ? 'sm' : (size as any)} className="mr-1" />
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
            {variant === 'gradient' && (
              <span className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></span>
            )}
          </span>
          {icon && iconPosition === 'right' && (
            <span className="flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:translate-x-0.5" aria-hidden="true">
              {icon}
            </span>
          )}
        </>
      )}
      
      {/* Enhanced ripple effect overlay */}
      <span className="absolute inset-0 rounded-inherit overflow-hidden pointer-events-none">
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></span>
      </span>
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
        onClick={handleClick}
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
      onClick={handleClick}
      data-theme-variant={variant}
      {...restProps}
    >
      {buttonContent}
    </button>
  )
})

Button.displayName = 'Button'

export default Button
