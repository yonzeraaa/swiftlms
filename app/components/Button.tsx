import { ButtonHTMLAttributes, ReactNode, useRef, MouseEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslation } from '../contexts/LanguageContext'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'gradient' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
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

  const baseStyles = `
    relative overflow-hidden font-semibold rounded-lg 
    transition-all duration-300 ease-out
    focus:outline-none focus:ring-2 focus:ring-offset-2 
    disabled:opacity-50 disabled:cursor-not-allowed 
    flex items-center justify-center gap-2
    transform active:scale-95
    ${fullWidth ? 'w-full' : ''}
  `
  
  const variants = {
    primary: `
      bg-gradient-to-r from-gold-500 to-gold-600 
      hover:from-gold-600 hover:to-gold-700 
      text-navy-900 
      focus:ring-gold-400 focus:ring-offset-navy-800 
      hover:-translate-y-0.5 hover:shadow-lg
      shadow-md
    `,
    secondary: `
      bg-navy-700/50 hover:bg-navy-600/50 
      text-gold-200 
      border border-gold-500/30 hover:border-gold-500/50
      focus:ring-gold-500 focus:ring-offset-navy-800
      backdrop-blur-sm
    `,
    danger: `
      bg-red-600 hover:bg-red-700 
      text-white 
      focus:ring-red-400 focus:ring-offset-navy-800
      hover:shadow-lg shadow-red-500/20
    `,
    ghost: `
      bg-transparent hover:bg-gold-500/10
      text-gold-300 hover:text-gold-100
      border border-transparent hover:border-gold-500/20
      focus:ring-gold-500 focus:ring-offset-navy-800
    `,
    gradient: `
      bg-gradient-to-r from-purple-500 via-gold-500 to-orange-500
      text-white font-bold
      hover:shadow-2xl hover:-translate-y-0.5
      focus:ring-gold-400 focus:ring-offset-navy-800
      background-size: 200% 100%
      animation: shimmer 3s ease-in-out infinite
    `,
    outline: `
      bg-transparent 
      text-gold-400 hover:text-gold-300
      border-2 border-gold-500/50 hover:border-gold-400
      hover:bg-gold-500/10
      focus:ring-gold-500 focus:ring-offset-navy-800
    `
  }
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  }

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
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
          <Loader2 className={`${iconSizes[size]} animate-spin`} />
          <span>{t('common.loading')}</span>
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <span className="transition-transform group-hover:scale-110 group-hover:-translate-x-0.5">
              {icon}
            </span>
          )}
          <span className="relative">
            {children}
            {variant === 'gradient' && (
              <span className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent animate-shimmer"></span>
            )}
          </span>
          {icon && iconPosition === 'right' && (
            <span className="transition-transform group-hover:scale-110 group-hover:translate-x-0.5">
              {icon}
            </span>
          )}
        </>
      )}
    </button>
  )
}