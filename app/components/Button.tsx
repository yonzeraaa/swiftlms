import { ButtonHTMLAttributes, ReactNode, useRef, MouseEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslation } from '../contexts/LanguageContext'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'gradient' | 'outline' | 'subtle' | 'success'
  size?: 'sm' | 'md' | 'lg' | 'xs' | 'xl'
  isLoading?: boolean
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
  rounded?: 'sm' | 'md' | 'lg' | 'full'
  pulse?: boolean
  glow?: boolean
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  rounded = 'lg',
  pulse = false,
  glow = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const { t } = useTranslation()
  const buttonRef = useRef<HTMLButtonElement>(null)
  
  const handleRipple = (e: MouseEvent<HTMLButtonElement>) => {
    const button = buttonRef.current
    if (!button) return

    const rect = button.getBoundingClientRect()
    const ripple = document.createElement('span')
    const size = Math.max(rect.width, rect.height)
    const x = e.clientX - rect.left - size / 2
    const y = e.clientY - rect.top - size / 2

    ripple.style.width = ripple.style.height = size + 'px'
    ripple.style.left = x + 'px'
    ripple.style.top = y + 'px'
    ripple.classList.add('ripple')

    button.appendChild(ripple)

    setTimeout(() => {
      ripple.remove()
    }, 600)
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
    flex items-center justify-center gap-2
    transform hover:transform active:scale-[0.98]
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
      hover:-translate-y-0.5 hover:shadow-xl
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
      hover:-translate-y-0.5
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
      bg-gradient-to-r from-purple-500 via-gold-500 to-orange-500
      text-white font-bold
      hover:shadow-2xl hover:-translate-y-0.5
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
      hover:-translate-y-0.5 hover:shadow-lg
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

  return (
    <button
      ref={buttonRef}
      className={`group ${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      onClick={(e) => {
        if (!disabled && !isLoading) {
          handleRipple(e)
        }
        props.onClick?.(e)
      }}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className={`${iconSizes[size]} animate-spin`} aria-hidden="true" />
          <span className="sr-only">{t('common.loading')}</span>
          <span aria-hidden="true">{t('common.loading')}</span>
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <span className="transition-all duration-300 group-hover:scale-110 group-hover:-translate-x-0.5" aria-hidden="true">
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
            <span className="transition-all duration-300 group-hover:scale-110 group-hover:translate-x-0.5" aria-hidden="true">
              {icon}
            </span>
          )}
        </>
      )}
      
      {/* Enhanced ripple effect overlay */}
      <span className="absolute inset-0 rounded-inherit overflow-hidden pointer-events-none">
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></span>
      </span>
    </button>
  )
}